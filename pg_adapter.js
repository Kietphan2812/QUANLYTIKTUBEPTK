const { Pool } = require("pg");

function createPgAdapter(connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  function transformQuery(sql, inputs) {
    let text = sql;

    // 1. Remove dbo.
    text = text.replace(/\bdbo\./gi, "");

    // 2. Replace GETDATE() / GETUTCDATE()
    text = text.replace(/\bGETUTCDATE\(\)/gi, "CURRENT_TIMESTAMP");
    text = text.replace(/\bGETDATE\(\)/gi, "CURRENT_TIMESTAMP");

    // 3. Replace ISNULL(a, b) with COALESCE(a, b)
    text = text.replace(/\bISNULL\s*\(/gi, "COALESCE(");

    // 4. Replace TRY_CAST(x AS INT) with CAST(x AS INT)
    text = text.replace(/\bTRY_CAST\s*\(/gi, "CAST(");

    // 5. Replace N'...' with '...'
    text = text.replace(/N'((?:[^']|'')*)'/g, "'$1'");

    // 6. Handle T-SQL table variables and OUTPUT INSERTED for both INSERT and UPDATE
    text = text.replace(/DECLARE\s+@\w+\s+TABLE\s+[\s\S]*?;\s*/gi, "");
    text = text.replace(/;\s*SELECT\s+\*\s+FROM\s+@\w+\s*;?\s*$/gi, "");

    const outputMatch = text.match(/\bOUTPUT\s+([\s\S]*?)(?:\s+INTO\s+@\w+)?\s+(VALUES|WHERE)\b/i);
    let returningCols = null;
    if (outputMatch) {
      returningCols = outputMatch[1]
        .replace(/INSERTED\./gi, "")
        .trim();
      text = text.replace(outputMatch[0], outputMatch[2]);
    }

    // 7. Handle SELECT TOP (N) / SELECT TOP N
    let topMatch = text.match(/\bSELECT\s+(DISTINCT\s+)?TOP\s*\(?(\d+)\)?\s+/i);
    let limitVal = null;
    if (topMatch) {
      const distinct = topMatch[1] || "";
      limitVal = topMatch[2];
      text = text.replace(topMatch[0], `SELECT ${distinct}`);
    }

    // 8. Replace parameters @name with $1, $2, ...
    const values = [];
    const paramRegex = /@([a-zA-Z0-9_]+)/g;
    
    // Replace while preserving parameter order
    text = text.replace(paramRegex, (full, name) => {
      const inputVal = inputs[name] !== undefined ? inputs[name] : null;
      values.push(inputVal);
      return `$${values.length}`;
    });

    text = text.trim().replace(/;+$/, "");

    if (returningCols) {
      text = `${text} RETURNING ${returningCols}`;
    }

    if (limitVal && !text.toUpperCase().includes("LIMIT") && !text.toUpperCase().includes("RETURNING")) {
      text = `${text} LIMIT ${limitVal}`;
    }

    return { text, values };
  }

  function makeRowProxy(row) {
    if (!row || typeof row !== "object") return row;
    return new Proxy(row, {
      get(target, prop) {
        if (typeof prop !== "string") return target[prop];
        if (prop in target) return target[prop];
        const lowerProp = prop.toLowerCase();
        for (const k of Object.keys(target)) {
          if (k.toLowerCase() === lowerProp) return target[k];
        }
        return undefined;
      }
    });
  }

  const adapter = {
    async connect() {
      return {
        request() {
          const inputs = {};
          const req = {
            input(name, _type, value) {
              if (value === undefined && _type !== undefined) {
                // called as input(name, value)
                inputs[name] = _type;
              } else {
                inputs[name] = value;
              }
              return req;
            },
            async query(sqlString) {
              const { text, values } = transformQuery(sqlString, inputs);
              try {
                const res = await pool.query(text, values);
                const proxiedRows = (res.rows || []).map(makeRowProxy);
                return {
                  recordset: proxiedRows,
                  recordsets: [proxiedRows],
                  rowsAffected: [res.rowCount || 0],
                };
              } catch (err) {
                console.error("[pg_query_error] Query:", text, "Values:", values, "Error:", err.message);
                throw err;
              }
            },
          };
          return req;
        },
      };
    },
    // Types stub
    Int: "Int",
    BigInt: "BigInt",
    NVarChar: () => "NVarChar",
    VarChar: () => "VarChar",
    Bit: "Bit",
    Float: "Float",
    DateTime: "DateTime",
    MAX: "MAX",
  };

  return adapter;
}

module.exports = { createPgAdapter };

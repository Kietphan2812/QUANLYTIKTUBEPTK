const express = require('express');
const cors = require('cors');
let sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Dual DB Adapter (Neon PostgreSQL or MSSQL)
if (process.env.DATABASE_URL) {
    const { createPgAdapter } = require('./pg_adapter');
    sql = createPgAdapter(process.env.DATABASE_URL);
    console.log('[QLYOUTUBE] Mode: Neon Cloud PostgreSQL');
} else {
    console.log('[QLYOUTUBE] Mode: Local SQL Server');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('./')); // Serve static files from current directory

// SQL Server Configuration (fallback for local)
const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Password123!',
    server: process.env.DB_SERVER || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '1434', 10),
    database: process.env.DB_NAME || 'VIDEO1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

const bcrypt = require('bcryptjs');

// Connect to Database and Seed Default Admin if needed
async function connectDB() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('✅ Connected to database successfully!');

        // Check/Seed default Admin account
        try {
            const check = await pool.request()
                .input('username', sql.NVarChar(100), 'admin')
                .query("SELECT username FROM dbo.tai_khoan_admin WHERE username = @username");
            if (!check.recordset || check.recordset.length === 0) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash('admin123', salt);
                await pool.request()
                    .input('username', sql.NVarChar(100), 'admin')
                    .input('password', sql.NVarChar(255), hash)
                    .query("INSERT INTO dbo.tai_khoan_admin (username, password) VALUES (@username, @password)");
                console.log('👑 Created default Admin: admin / admin123');
            }
        } catch (e) {
            console.warn('[Admin Seed Warning]:', e.message);
        }
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
}
connectDB();

// ============================================
// API ROUTES FOR [video] TABLE
// ============================================

// GET ALL APPROVED videos
app.get('/api/videos', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT * FROM dbo.video WHERE trang_thai = 'da_duyet' ORDER BY video_id DESC");
        res.json(result.recordset || []);
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// GET ALL videos (Dành riêng cho Quản trị viên quản lý)
app.get('/api/admin/videos', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT v.*, u.ten_dang_nhap as nguoi_dang, kd.ly_do as ly_do_kiem_duyet, kd.admin_username as nguoi_kiem_duyet, (SELECT COUNT(*) FROM dbo.bao_cao_video bc WHERE bc.video_id = v.video_id) AS so_bao_cao FROM dbo.video v LEFT JOIN dbo.nguoi_dung u ON v.nguoi_dung_id = u.nguoi_dung_id LEFT JOIN (SELECT k1.video_id, k1.ly_do, k1.admin_username FROM dbo.kiem_duyet_video k1 WHERE k1.id = (SELECT MAX(k2.id) FROM dbo.kiem_duyet_video k2 WHERE k2.video_id = k1.video_id)) kd ON v.video_id = kd.video_id ORDER BY v.video_id DESC");
        res.json(result.recordset || []);
    } catch (err) {
        console.error('Error fetching admin videos:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// GET ALL USERS (Admin dashboard)
app.get('/api/admin/users', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT nguoi_dung_id, ten_dang_nhap, email, anh_dai_dien, ngay_tao FROM dbo.nguoi_dung ORDER BY nguoi_dung_id DESC");
        res.json(result.recordset || []);
    } catch (err) {
        console.error('Error fetching admin users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// RESET USER PASSWORD (Admin action)
const crypto = require('crypto');
function hashPassword(raw) {
    return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
}
app.put('/api/admin/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const newPasswordHash = hashPassword('123456'); // Reset to 123456
        
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id)
            .input('hash', sql.NVarChar(255), newPasswordHash)
            .query("UPDATE dbo.nguoi_dung SET mat_khau_hash = @hash, ngay_cap_nhat = GETUTCDATE() WHERE nguoi_dung_id = @id");
            
        res.json({ message: 'Password reset to 123456 successfully' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// GET single video by ID
app.get('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT * FROM dbo.video WHERE video_id = @id");
            
        if (!result.recordset || result.recordset.length === 0) return res.status(404).json({ message: 'Video not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching video:', err);
        res.status(500).json({ error: 'Failed to fetch video' });
    }
});

// UPDATE an existing video
app.put('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, description, thumbnail } = req.body;
        const pool = await sql.connect(dbConfig);
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('tieu_de', sql.NVarChar(255), title || '')
            .input('duong_dan_video', sql.NVarChar(500), url || '')
            .input('mo_ta', sql.NVarChar(sql.MAX), description || '')
            .input('duong_dan_anh_bia', sql.NVarChar(500), thumbnail || '')
            .query("UPDATE dbo.video SET tieu_de = @tieu_de, duong_dan_video = @duong_dan_video, mo_ta = @mo_ta, duong_dan_anh_bia = @duong_dan_anh_bia WHERE video_id = @id");
            
        const verify = await pool.request().input('id', sql.Int, id).query("SELECT * FROM dbo.video WHERE video_id = @id");
        if (!verify.recordset || verify.recordset.length === 0) return res.status(404).json({ message: 'Video not found' });
        res.json(verify.recordset[0]);
    } catch (err) {
        console.error('Error updating video:', err);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

// UPDATE video STATUS (Duyệt / Từ chối / Chờ duyệt)
app.put('/api/videos/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai, ly_do, admin_username } = req.body;
        if (!trang_thai) return res.status(400).json({ error: 'Thiếu trang_thai' });

        const pool = await sql.connect(dbConfig);
        
        // Cập nhật bảng video
        await pool.request()
            .input('id', sql.Int, id)
            .input('trang_thai', sql.NVarChar(50), trang_thai)
            .query("UPDATE dbo.video SET trang_thai = @trang_thai WHERE video_id = @id");
            
        // Lưu lịch sử kiểm duyệt
        try {
            await pool.request()
                .input('video_id', sql.Int, id)
                .input('admin_username', sql.NVarChar(100), admin_username || 'Admin')
                .input('trang_thai_moi', sql.NVarChar(50), trang_thai)
                .input('ly_do', sql.NVarChar(sql.MAX), ly_do || '')
                .query("INSERT INTO dbo.kiem_duyet_video (video_id, admin_username, trang_thai_moi, ly_do) VALUES (@video_id, @admin_username, @trang_thai_moi, @ly_do)");
        } catch (e) {
            console.warn('[kiem_duyet_video warning]:', e.message);
        }
            
        const verify = await pool.request().input('id', sql.Int, id).query("SELECT * FROM dbo.video WHERE video_id = @id");
        if (!verify.recordset || verify.recordset.length === 0) return res.status(404).json({ message: 'Video not found' });
        res.json(verify.recordset[0]);
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// DELETE a video
app.delete('/api/videos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM dbo.video WHERE video_id = @id");
            
        res.json({ message: 'Video deleted successfully' });
    } catch (err) {
        console.error('Error deleting video:', err);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// ============================================
// API ROUTES FOR AUTHENTICATION
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });

        const pool = await sql.connect(dbConfig);
        
        const checkUser = await pool.request()
            .input('username', sql.NVarChar(100), username)
            .query("SELECT username FROM dbo.tai_khoan_admin WHERE username = @username");
            
        if (checkUser.recordset && checkUser.recordset.length > 0) {
            return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.request()
            .input('username', sql.NVarChar(100), username)
            .input('password', sql.NVarChar(255), hashedPassword)
            .query("INSERT INTO dbo.tai_khoan_admin (username, password) VALUES (@username, @password)");

        res.status(201).json({ message: 'Đăng ký thành công' });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Lỗi server khi đăng ký' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Thiếu username hoặc password' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('username', sql.NVarChar(100), username)
            .query("SELECT * FROM dbo.tai_khoan_admin WHERE username = @username");

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(400).json({ error: 'Tài khoản không tồn tại' });
        }

        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Mật khẩu không chính xác' });
        }

        res.json({ message: 'Đăng nhập thành công', token: 'fake_jwt_token_for_now', username: user.username });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
    }
});

// GET OVERALL STATISTICS (Admin)
app.get('/api/admin/stats/overall', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        const totalsResult = await pool.request().query("SELECT (SELECT COALESCE(SUM(luot_xem), 0) FROM dbo.video) as total_views, (SELECT COUNT(*) FROM dbo.luot_thich) as total_likes, (SELECT COUNT(*) FROM dbo.binh_luan) as total_comments");
        const totals = totalsResult.recordset?.[0] || { total_views: 0, total_likes: 0, total_comments: 0 };
        
        const videosResult = await pool.request().query("SELECT v.video_id, v.tieu_de, v.mo_ta, v.luot_xem, v.duong_dan_anh_bia, (SELECT COUNT(*) FROM dbo.luot_thich l WHERE l.video_id = v.video_id) as so_luot_thich, (SELECT COUNT(*) FROM dbo.binh_luan c WHERE c.video_id = v.video_id) as so_binh_luan, u.ten_dang_nhap as nguoi_dang FROM dbo.video v LEFT JOIN dbo.nguoi_dung u ON v.nguoi_dung_id = u.nguoi_dung_id ORDER BY v.luot_xem DESC");

        res.json({
            totals: totals,
            daily: [],
            videos: videosResult.recordset || []
        });
    } catch (err) {
        console.error('Error fetching admin live stats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics: ' + err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👉 Admin Panel available at /admin.html`);
});

// const { Pool } = require('pg');

// // Tạo pool kết nối đến PostgreSQL, sử dụng connection string từ biến môi trường
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL
// });

// // Lắng nghe sự kiện khi kết nối thành công
// pool.on('connect', () => {
//   console.log('Đã kết nối đến PostgreSQL');
// });

// // Lắng nghe sự kiện lỗi trong quá trình kết nối
// pool.on('error', (err) => {
//   console.error('Lỗi kết nối PostgreSQL:', err);
// });

// // Xuất pool để sử dụng trong các module khác
// module.exports = pool;

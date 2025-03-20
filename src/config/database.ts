import { Pool } from 'pg';

// Tạo pool kết nối đến PostgreSQL, sử dụng connection string từ biến môi trường
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// datasource db {
//   provider = "postgresql"
//   url      = env("DATABASE_URL", "postgres://tmsthong:123123@localhost:5432/bloggen")
// }

// const databaseConfig = {
//   provider: 'postgresql',
//   url: process.env.DATABASE_URL,
// };

// interface databaseConfig {
//   provider: string;
//   url: string;
// }

// const pool = new Pool(databaseConfig);

// Lắng nghe sự kiện khi kết nối thành công

// const databaseConfig = {
//   user: env.username,
//   host: env.host,
//   database: env.database_name,
//   password: env.database_pass,
//   port: env.parentPort,
// };

// const pool = new Pool(databaseConfig);
pool.on('connect', () => {
  console.log('Đã kết nối đến PostgreSQL');
});

// Lắng nghe sự kiện lỗi trong quá trình kết nối
pool.on('error', (err) => {
  console.error('Lỗi kết nối PostgreSQL:', err);
});

// Xuất pool để sử dụng trong các module khác
export { pool };

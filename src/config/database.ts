import { Pool } from 'pg';

const databaseConfig = {
  user: 'tmsthong',
  host: 'localhost',
  database: 'bloggen',
  password: '123123',
  port: 5432,
};

const pool = new Pool(databaseConfig);

export default pool;

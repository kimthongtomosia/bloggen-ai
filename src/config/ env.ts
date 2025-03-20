interface Env {
  NODE_ENV: string;
  PORT: number;
}

const env: Env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
};

export default env;

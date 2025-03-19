import dotenv from 'dotenv';
import express from 'express';

import blogRoutes from './routes/blog.routes';
import categoryRoutes from './routes/category.routes';

dotenv.config();

if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('GOOGLE_AI_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('GOOGLE_AI_API_KEY is set:', process.env.GOOGLE_AI_API_KEY.substring(0, 5) + '...');

const app = express();
app.use(express.json());

app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy tại http://localhost:${PORT}`));

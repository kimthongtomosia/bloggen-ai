import express, { Router } from 'express';

import { blogController } from '../controllers/blog.controller';

const router: Router = express.Router();

// Route tạo bài viết mới
router.post('/create', blogController.createBlog);

// Route lấy danh sách bài viết (hỗ trợ phân trang và lọc theo danh mục)
router.get('/', blogController.getBlogs);

// Route xuất bài viết dưới các định dạng (JSON, Markdown, HTML)
router.get('/export', blogController.exportBlogs);

// Route tìm kiếm bài viết theo nội dung
router.get('/search', blogController.searchBlogs);

export default router;

import express from 'express';

const router = express.Router();
import blogController from '../controllers/blog.controller';
import { categoryController } from '../controllers/category.controller';

// Blog Routes
router.post('/blogs/create', blogController.createBlog);
router.get('/blogs', blogController.getBlogs);
router.get('/blogs/export', blogController.exportBlogs);

// Category Routes
router.post('/categories', categoryController.createCategory);
router.get('/categories', categoryController.getCategories);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

module.exports = router;

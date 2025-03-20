import express, { Router } from 'express';

import { categoryController } from '../controllers/category.controller';

const router: Router = express.Router();

// Route lấy danh sách tất cả danh mục
router.get('/', categoryController.getCategories);

// Route tạo danh mục mới
router.post('/', categoryController.createCategory);

// Route cập nhật thông tin danh mục theo ID
router.put('/:id', categoryController.updateCategory);

// Route xóa danh mục theo ID
router.delete('/:id', categoryController.deleteCategory);

export default router;

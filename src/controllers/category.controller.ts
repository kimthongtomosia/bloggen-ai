import { Request, Response } from 'express';
import { Pool } from 'pg';

import pool from '../config/database';

// Tạo danh mục mới
export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Tên danh mục là bắt buộc.' });
  }

  try {
    const result = await pool.query(`INSERT INTO categories (name) VALUES ($1) RETURNING *`, [name]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi khi tạo danh mục: ' + error.message });
  }
};

// Lấy danh sách tất cả các danh mục
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories');
    res.status(200).json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi khi lấy danh sách danh mục: ' + error.message });
  }
};

// Cập nhật danh mục
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Tên danh mục là bắt buộc.' });
  }

  try {
    const result = await pool.query(`UPDATE categories SET name = $1 WHERE id = $2 RETURNING *`, [name, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi khi cập nhật danh mục: ' + error.message });
  }
};

// Xóa danh mục
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục.' });
    }

    res.status(200).json({ message: 'Xóa danh mục thành công.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi khi xóa danh mục: ' + error.message });
  }
};

export const categoryController = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

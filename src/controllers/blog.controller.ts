import { Request, Response, NextFunction } from 'express';

import { pool } from '../config/database';
import { googleAIService } from '../services/ai.service';
import { crawlContent } from '../services/crawl.service';

// Hàm tạo blog mới
export const createBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('Nhận yêu cầu tạo bài viết:', req.body);
  const { url, style, category } = req.body;

  // Kiểm tra tham số đầu vào
  if (!url || !category) {
    console.log('Thiếu tham số bắt buộc (url hoặc category).');
    res.status(400).json({ error: 'Thiếu tham số bắt buộc: url hoặc category.' });
    return;
  }

  try {
    // Crawl nội dung từ URL
    console.log(`Bắt đầu crawl từ URL: ${url}`);
    const crawledData = await crawlContent(url);

    if (!crawledData || !crawledData.content || !crawledData.title) {
      console.log('Không tìm thấy nội dung từ URL.');
      res.status(400).json({ error: 'Không tìm thấy nội dung từ URL.' });
      return;
    }

    console.log('Crawl thành công. Tiêu đề:', crawledData.title);

    // Tạo prompt cho AI
    const prompt = `Viết lại bài viết sau với phong cách ${style || 'Chung chung'}:\n\nTiêu đề: ${
      crawledData.title
    }\n\nNội dung:\n${crawledData.content}`;

    // Gọi AI để viết lại nội dung
    console.log(`Gửi yêu cầu AI để viết lại nội dung với phong cách: ${style || 'Chung chung'}`);
    const rewrittenContent = await googleAIService.generateContent(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    if (!rewrittenContent) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    console.log('AI đã xử lý xong nội dung.');

    // Lưu vào PostgreSQL
    console.log('Lưu bài viết vào PostgreSQL...');
    const result = await pool.query(`INSERT INTO blogs (title, content, category) VALUES ($1, $2, $3) RETURNING *`, [
      crawledData.title,
      rewrittenContent,
      category,
    ]);

    console.log('Bài viết đã được lưu thành công.');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(' Lỗi khi tạo blog:', error.message);
    res.status(500).json({ error: 'Lỗi khi tạo blog: ' + error.message });
    next(error);
  }
};

// Hàm lấy danh sách blog với phân trang
export const getBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { page = 1, limit = 10, category } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    // Truy vấn số lượng tổng blog
    const countQuery = category ? 'SELECT COUNT(*) FROM blogs WHERE category = $1' : 'SELECT COUNT(*) FROM blogs';
    const countParams = category ? [category] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Truy vấn danh sách blog có phân trang
    const query = category
      ? `SELECT * FROM blogs WHERE category = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT * FROM blogs ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const params = category ? [category, limit, offset] : [limit, offset];
    const result = await pool.query(query, params);

    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: {
        page: parseInt(page.toString(), 10),
        limit: parseInt(limit.toString(), 10),
        total,
        pages: Math.ceil(total / (limit.toString(), 10)),
      },
    });
  } catch (error) {
    console.error('Error getting blogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy danh sách bài viết: ' + error.message,
    });
    next(error);
  }
};

// Hàm tìm kiếm blog theo từ khóa và danh mục
export const searchBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { keyword, category, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `SELECT * FROM blogs WHERE TRUE`;
    const params = [];

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    if (keyword) {
      query += ` AND (title ILIKE $${params.length + 1} OR content ILIKE $${params.length + 1})`;
      params.push(`%${keyword}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi tìm kiếm bài viết: ' + error.message });
    next(error);
  }
};

// Hàm xuất blog dưới nhiều định dạng
export const exportBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { format = 'json' } = req.query;

  try {
    // Lấy toàn bộ blog từ database
    const result = await pool.query('SELECT * FROM blogs');
    const blogs = result.rows;

    if (blogs.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Không có bài viết nào để xuất',
      });
      return;
    }

    let content: string;
    let contentType: string | number | readonly string[];
    let fileName: string;

    // Xử lý định dạng xuất dữ liệu
    const exportFormat = Array.isArray(format) ? format[0] : format;
    if (typeof exportFormat !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Định dạng không hợp lệ. Hỗ trợ: json, md, html',
      });
      return;
    }
    switch (exportFormat.toLowerCase()) {
      case 'json':
        content = JSON.stringify(blogs, null, 2);
        contentType = 'application/json';
        fileName = 'blogs.json';
        break;

      case 'md':
        content = blogs.map((blog) => `# ${blog.title}\n\n${blog.content}\n\n---\n`).join('\n');
        contentType = 'text/markdown';
        fileName = 'blogs.md';
        break;

      case 'html':
        content = `
          <!DOCTYPE html>
          <html>
          <head><title>Exported Blogs</title></head>
          <body>
            ${blogs
              .map(
                (blog) => `
              <article>
                <h1>${blog.title}</h1>
                <div>${blog.content}</div>
              </article>
            `
              )
              .join('\n')}
          </body>
          </html>
        `;
        contentType = 'text/html';
        fileName = 'blogs.html';
        break;

      default:
        res.status(400).json({
          status: 'error',
          message: 'Định dạng không hợp lệ. Hỗ trợ: json, md, html',
        });
        return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(content);
  } catch (error) {
    console.error('Error exporting blogs:', error);
    res.status(500).json({ status: 'error', message: 'Lỗi khi xuất bài viết: ' + error.message });
    next(error);
  }
};

export default {
  createBlog,
  getBlogs,
  searchBlogs,
  exportBlogs,
};

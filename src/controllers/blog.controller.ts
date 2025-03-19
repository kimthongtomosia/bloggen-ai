import { Request, Response, RequestHandler } from 'express';
import { Pool } from 'pg';
import { ParsedQs } from 'qs';

import { googleAIService } from '../services/ai.service.js';
import { crawlContent } from '../services/crawl.service.js';
// import { googleAIService } from "../services/ai.service";

const pool = new Pool(); // Đảm bảo bạn đã cấu hình Pool trong `db/index.ts`

// Hàm tạo blog mới
export const createBlog = async (req: Request, res: Response) => {
  console.log('🔍 Nhận yêu cầu tạo bài viết:', req.body);
  const { url, style, category } = req.body as { url: string; style?: string; category: string };

  if (!url || !category) {
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc: url hoặc category.' });
  }

  try {
    console.log(`Bắt đầu crawl từ URL: ${url}`);
    const crawledData = await crawlContent(url);

    if (!crawledData?.content || !crawledData?.title) {
      return res.status(400).json({ error: 'Không tìm thấy nội dung từ URL.' });
    }

    console.log('Crawl thành công. Tiêu đề:', crawledData.title);

    const prompt = `Viết lại bài viết sau với phong cách ${style || 'Chung chung'}:\n\nTiêu đề: ${
      crawledData.title
    }\n\nNội dung:\n${crawledData.content}`;
    console.log(`Gửi yêu cầu AI để viết lại nội dung với phong cách: ${style || 'Chung chung'}`);

    const rewrittenContent = await googleAIService.generateContent(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    if (!rewrittenContent) {
      throw new Error('Không nhận được phản hồi từ AI');
    }

    console.log('AI đã xử lý xong nội dung.');

    const result = await pool.query('INSERT INTO blogs (title, content, category) VALUES ($1, $2, $3) RETURNING *', [
      crawledData.title,
      rewrittenContent,
      category,
    ]);

    console.log('Bài viết đã được lưu thành công.');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Lỗi khi tạo blog:', error.message);
    res.status(500).json({ error: 'Lỗi khi tạo blog: ' + error.message });
  }
};

// Hàm lấy danh sách blog với phân trang
export const getBlogs = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const offset = (page - 1) * limit;

  try {
    const countQuery = category ? 'SELECT COUNT(*) FROM blogs WHERE category = $1' : 'SELECT COUNT(*) FROM blogs';
    const countParams = category ? [category] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    const query = category
      ? `SELECT * FROM blogs WHERE category = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT * FROM blogs ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    const params = category ? [category, limit, offset] : [limit, offset];

    const result = await pool.query(query, params);

    res.status(200).json({
      status: 'success',
      data: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách bài viết:', error.message);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách bài viết: ' + error.message });
  }
};

// Hàm tìm kiếm blog theo từ khóa và danh mục
export const searchBlogs = async (req: Request, res: Response) => {
  const keyword = req.query.keyword as string;
  const category = req.query.category as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM blogs WHERE TRUE';
    const params: any[] = [];

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
  } catch (error: any) {
    res.status(500).json({ error: 'Lỗi khi tìm kiếm bài viết: ' + error.message });
  }
};

// Hàm xuất blog dưới nhiều định dạng
export const exportBlogs = async (req: Request, res: Response) => {
  const format = ((req.query.format as string) || 'json').toLowerCase();

  try {
    const result = await pool.query('SELECT * FROM blogs');
    const blogs = result.rows;

    if (blogs.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Không có bài viết nào để xuất' });
    }

    let content: string;
    let contentType: string;
    let fileName: string;

    switch (format) {
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
            ${blogs.map((blog) => `<article><h1>${blog.title}</h1><div>${blog.content}</div></article>`).join('\n')}
          </body>
          </html>`;
        contentType = 'text/html';
        fileName = 'blogs.html';
        break;

      default:
        return res.status(400).json({ status: 'error', message: 'Định dạng không hợp lệ. Hỗ trợ: json, md, html' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(content);
  } catch (error: any) {
    console.error('Lỗi khi xuất bài viết:', error.message);
    res.status(500).json({ status: 'error', message: 'Lỗi khi xuất bài viết: ' + error.message });
  }
};

export const blogController = {
  exportBlogs,
  createBlog,
  getBlogs,
  searchBlogs,
};

#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';

import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import dotenv from 'dotenv';
import ora from 'ora';

import { parseCSV } from '../services/csv.service';
import { scheduleCrawl, stopSchedule } from '../services/scheduler.service';

dotenv.config();

const program = new Command();

interface CrawlOptions {
  style?: string;
  category?: string;
}

interface ListOptions {
  page?: string;
  limit?: string;
  category?: string;
}

interface ExportOptions {
  format?: string;
  output?: string;
}

interface BlogResponse {
  data: any;
}

// Định nghĩa thông tin CLI
program.name('bloggen').description('Công cụ CLI để quản lý hệ thống tự động tạo blog').version('1.0.0');

// Lệnh khởi tạo hệ thống
program
  .command('init')
  .description('Khởi tạo cấu hình và kết nối database')
  .action(() => {
    console.log(chalk.green('Cấu hình hệ thống đã được khởi tạo thành công!'));
  });

// Lệnh lên lịch crawl tự động
program
  .command('schedule')
  .description('Lên lịch crawl tự động từ file CSV')
  .option('--cron <cronExpression>', 'Biểu thức cron để lên lịch')
  .option('--csv <csvPath>', 'Đường dẫn file CSV cần xử lý')
  .action((options: { cron: string; csv: string }) => {
    if (!options.cron || !options.csv) {
      console.error(' Cần cung cấp biểu thức cron và đường dẫn file CSV.');
      return;
    }
    scheduleCrawl(options.cron, options.csv);
  });

// Lệnh dừng lịch crawl
program
  .command('stop-schedule')
  .description('Dừng lịch crawl cho file CSV đã lên lịch trước đó')
  .argument('<csvPath>', 'Đường dẫn file CSV cần dừng')
  .action((csvPath: string) => {
    stopSchedule(csvPath);
  });

// Lệnh crawl một URL duy nhất
program
  .command('crawl <url>')
  .description('Crawl và tạo bài viết từ một URL')
  .option('--style <style>', 'Yêu cầu phong cách viết')
  .option('--category <category>', 'Tên danh mục')
  .action(async (url: string, options: CrawlOptions) => {
    const spinner = ora('Đang crawl và viết lại bài viết...').start();
    try {
      console.log('Đang gửi yêu cầu tới server với dữ liệu:', {
        url,
        style: options.style || 'Chung chung',
        category: options.category || 'Không phân loại',
      });
      const response = await axios.post<BlogResponse>('http://localhost:3000/api/blogs/create', {
        url,
        style: options.style || 'Chung chung',
        category: options.category || 'Không phân loại',
      });
      spinner.succeed('Crawl và viết lại bài viết thành công!');
      console.log(chalk.green(JSON.stringify(response.data, null, 2)));
    } catch (error: any) {
      spinner.fail('Lỗi khi tạo bài viết.');
      console.error(chalk.red(error.message));
    }
  });

// Lệnh xử lý file CSV
program
  .command('batch <csvFile>')
  .description('Xử lý hàng loạt URL từ file CSV')
  .action(async (csvFile: string) => {
    const spinner = ora('Đang xử lý file CSV...').start();
    try {
      const rows = await parseCSV(csvFile);
      spinner.text = 'Đang xử lý các URL...';
      for (const row of rows) {
        try {
          await axios.post<BlogResponse>('http://localhost:3000/api/blogs/create', {
            url: row['URL bài viết'],
            style: row['Phong cách'] || 'Chung chung',
            category: row['Chuyên mục'] || 'Không phân loại',
          });
          console.log(chalk.green(` Xử lý thành công URL: ${row['URL bài viết']}`));
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Tránh bị rate limit
        } catch (error: any) {
          console.error(chalk.red(` Lỗi khi xử lý URL: ${row['URL bài viết']}`));
        }
      }
      spinner.succeed('Đã hoàn thành xử lý tất cả các URL.');
    } catch (error: any) {
      spinner.fail(' Lỗi khi xử lý file CSV.');
      console.error(chalk.red(error.message));
    }
  });

// Lệnh liệt kê bài viết
program
  .command('list')
  .description('Liệt kê các bài viết đã tạo')
  .option('--page <page>', 'Số trang', '1')
  .option('--limit <limit>', 'Số bài viết mỗi trang', '10')
  .option('--category <category>', 'Lọc theo danh mục')
  .action(async (options: ListOptions) => {
    const spinner = ora('Đang lấy danh sách bài viết...').start();
    try {
      const response = await axios.get<BlogResponse>('http://localhost:3000/api/blogs', {
        params: { page: options.page, limit: options.limit, category: options.category },
      });
      spinner.succeed(' Lấy danh sách bài viết thành công!');
      console.log(chalk.blue('DANH SÁCH BÀI VIẾT'), response.data);
    } catch (error: any) {
      spinner.fail('Lỗi khi lấy danh sách bài viết.');
      console.error(chalk.red(error.message));
    }
  });

// Lệnh xuất bài viết
program
  .command('export')
  .description('Xuất bài viết ra file')
  .option('--format <format>', 'Định dạng file (json, md, html)', 'json')
  .option('--output <path>', 'Đường dẫn lưu file', './exports')
  .action(async (options: ExportOptions) => {
    const spinner = ora('Đang xuất bài viết...').start();
    try {
      const response = await axios.get('http://localhost:3000/api/blogs/export', {
        params: { format: options.format },
        responseType: 'stream',
      });

      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
        const filePath = path.join(options.output, fileName);
        const writer = fs.createWriteStream(filePath);

        (response.data as NodeJS.ReadableStream).pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', (error) => reject(error));
        });

        spinner.succeed(`Đã xuất bài viết thành công vào: ${filePath}`);
      } else {
        spinner.fail('Không tìm thấy tên file trong header.');
      }
    } catch (error: any) {
      spinner.fail('Lỗi khi xuất bài viết.');
      console.error(chalk.red(error.message));
    }
  });

program.parse(process.argv);

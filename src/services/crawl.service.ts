import path from 'path';
import { Worker } from 'worker_threads';

import puppeteer from 'puppeteer';

/**
 * Chạy worker thread để xử lý crawl nội dung
 * @param data - Dữ liệu cần truyền vào worker (URL cần crawl)
 * @returns Promise<{ url: string, content: string } | { error: string }>
 */
function runWorker(data: { url: string }): Promise<{ url: string; content: string } | { error: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, './worker.js'), { workerData: data });

    worker.on('message', resolve); // Nhận kết quả từ worker
    worker.on('error', reject); // Worker gặp lỗi, promise bị reject
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}

/**
 * Xử lý danh sách URL bằng worker threads
 * @param urls - Mảng các URL cần xử lý
 * @returns Promise<Array<{ url: string, content: string } | { error: string }>>
 */
export async function processURLs(
  urls: string[]
): Promise<Array<{ url: string; content: string } | { error: string }>> {
  const promises = urls.map((url) => runWorker({ url }));
  return await Promise.all(promises);
}

/**
 * Trực tiếp crawl nội dung từ một trang web bằng Puppeteer
 * @param url - URL của trang web cần crawl
 * @returns Promise<{ title: string; content: string }>
 */
export async function crawlContent(url: string): Promise<{ title: string; content: string }> {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log(`🚀 Đang truy cập URL: ${url}`);

    // Điều hướng đến URL, chờ DOM load xong
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Lấy tiêu đề và nội dung chính từ trang
    const data = await page.evaluate(() => {
      const title = document.querySelector('title')?.innerText || 'Không tìm thấy tiêu đề';

      // Thử lấy nội dung từ các thẻ phổ biến
      const contentSelectors = ['article', 'div.content', 'div.main-content', 'section', 'body'];
      let content = '';

      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = element.textContent?.trim() || '';
          break;
        }
      }

      return { title, content };
    });

    await browser.close();
    return data;
  } catch (error) {
    await browser.close();
    throw new Error(`❌ Lỗi khi crawl dữ liệu: ${error.message}`);
  }
}

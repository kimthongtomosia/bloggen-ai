import { parentPort, workerData } from 'worker_threads';

import puppeteer from 'puppeteer';

(async () => {
  try {
    const { url } = workerData; // Nhận URL từ workerData

    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Tránh lỗi quyền hạn khi chạy trên server
    });

    const page = await browser.newPage();

    // Điều hướng đến trang web với timeout 15s
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Kiểm tra xem trang có lỗi không
    if (!response || response.status() >= 400) {
      throw new Error(`Lỗi truy cập trang: ${response?.status()} - ${url}`);
    }

    // Lấy nội dung HTML của trang
    const content = await page.content();

    await browser.close();

    // Gửi nội dung về thread chính
    parentPort?.postMessage({ url, content });
  } catch (error: any) {
    parentPort?.postMessage({ error: error.message });
  }
})();

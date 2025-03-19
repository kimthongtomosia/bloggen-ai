import cron, { ScheduledTask } from 'node-cron';

import { processURLs } from './crawl.service';
import { parseCSV } from './csv.service';

const tasks: Map<string, ScheduledTask> = new Map();

/**
 * Lên lịch crawl dữ liệu từ file CSV theo cron schedule
 * @param cronExpression Biểu thức cron để xác định thời gian chạy
 * @param csvPath Đường dẫn đến file CSV chứa danh sách URL
 */
export function scheduleCrawl(cronExpression: string, csvPath: string): void {
  if (!cron.validate(cronExpression)) {
    console.error(`Biểu thức cron không hợp lệ: ${cronExpression}`);
    return;
  }

  // Tạo một tác vụ cron để chạy định kỳ
  const task = cron.schedule(cronExpression, async () => {
    console.log(`Đang thực thi lịch crawl theo cron: ${cronExpression}`);

    try {
      // Đọc nội dung file CSV và lấy danh sách các URL
      const rows: Record<string, any>[] = await parseCSV(csvPath);
      const urls: string[] = rows.map((row) => row['URL bài viết']).filter(Boolean); // Lấy URL hợp lệ

      if (urls.length === 0) {
        console.warn(`Không có URL hợp lệ trong file CSV: ${csvPath}`);
        return;
      }

      // Gọi hàm xử lý các URL đã lấy được
      const results = await processURLs(urls);

      // Kiểm tra kết quả sau khi xử lý từng URL
      results.forEach((result) => {
        if (result.error) {
          console.error(`Lỗi khi xử lý URL: ${result.url}. Lỗi: ${result.error}`);
        } else {
          console.log(`Đã xử lý thành công URL: ${result.url}`);
        }
      });
    } catch (error: any) {
      console.error(`Lỗi khi đọc file CSV hoặc xử lý URL: ${error.message}`);
    }
  });

  // Bắt đầu chạy task
  task.start();

  // Lưu task vào danh sách quản lý
  tasks.set(csvPath, task);
  console.log(`Lịch crawl cho file ${csvPath} đã được lên lịch.`);
}

/**
 * Dừng lịch crawl theo file CSV
 * @param csvPath Đường dẫn file CSV để hủy lịch
 */
export function stopSchedule(csvPath: string): void {
  const task = tasks.get(csvPath);
  if (task) {
    task.stop(); // Dừng tác vụ cron đang chạy
    tasks.delete(csvPath); // Xóa khỏi danh sách quản lý
    console.log(`Lịch crawl cho ${csvPath} đã bị dừng.`);
  } else {
    console.log(`Không tìm thấy lịch crawl cho file CSV: ${csvPath}.`);
  }
}

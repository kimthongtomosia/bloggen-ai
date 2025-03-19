import fs from 'fs';
import path from 'path';

import csvParser from 'csv-parser';

/**
 * Đọc file CSV và chuyển thành mảng JSON
 * @param filePath Đường dẫn file CSV
 * @returns Promise<object[]> Mảng chứa dữ liệu từ CSV
 */
export async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      return reject(new Error(` File không tồn tại: ${filePath}`));
    }

    const results: Record<string, string>[] = [];
    let headerChecked = false;

    const stream = fs
      .createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers: string[]) => {
        if (headers.length === 0) {
          stream.destroy();
          return reject(new Error('File CSV không có header hợp lệ.'));
        }
        headerChecked = true;
      })
      .on('data', (data: Record<string, string>) => results.push(data))
      .on('end', () => {
        if (!headerChecked) {
          return reject(new Error('File CSV không có tiêu đề hợp lệ.'));
        }
        if (results.length === 0) {
          return reject(new Error(' File CSV rỗng hoặc không có dữ liệu hợp lệ.'));
        }
        resolve(results);
      })
      .on('error', (err: Error) => reject(new Error(`Lỗi khi đọc file CSV: ${err.message}`)));
  });
}

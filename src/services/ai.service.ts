import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Lớp RateLimiter giúp giới hạn số lượng yêu cầu gửi đến API trong một khoảng thời gian nhất định.
 */
class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[];

  constructor(maxRequests = 3, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * Kiểm tra và giới hạn số lượng yêu cầu trong khoảng thời gian windowMs.
   * Nếu đạt giới hạn, sẽ đợi trước khi tiếp tục.
   */
  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const timeToWait = this.windowMs;
      console.log(`Rate limit reached. Waiting ${timeToWait}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
      return this.checkLimit();
    }

    this.requests.push(now);
  }
}

/**
 * Cấu hình tùy chọn cho phương thức `generateContent`
 */
interface GenerateContentOptions {
  maxRetries?: number;
  retryDelay?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Lớp GoogleAIService để làm việc với Google Generative AI.
 */
class GoogleAIService {
  private apiKey: string;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private rateLimiter: RateLimiter;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Missing GOOGLE_AI_API_KEY in .env');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    this.rateLimiter = new RateLimiter(3, 60000); // Giới hạn 3 requests/phút
  }

  /**
   * Gửi prompt đến Google Generative AI và lấy nội dung phản hồi.
   * Hỗ trợ retry nếu request bị lỗi.
   *
   * @param prompt - Nội dung yêu cầu AI xử lý.
   * @param options - Cấu hình tùy chỉnh (maxRetries, retryDelay).
   * @returns Nội dung phản hồi từ AI.
   */
  async generateContent(prompt: string, options: GenerateContentOptions = {}): Promise<string> {
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const defaultOptions: GenerateContentOptions = {
      maxRetries: 3,
      retryDelay: 1000,
    };

    const config = { ...defaultOptions, ...options };

    let attempt = 0;
    while (attempt < config.maxRetries!) {
      try {
        await this.rateLimiter.checkLimit();

        console.log(`🔍 Sending request: "${prompt.substring(0, 50)}..."`);

        const result = await this.model.generateContent(prompt);
        const response = await result.response;

        if (!response || !response.text()) {
          throw new Error('Invalid response from Google AI API');
        }

        return response.text().trim();
      } catch (error: any) {
        attempt++;

        if (error.response?.status === 429) {
          const delay = config.retryDelay! * Math.pow(2, attempt);
          console.log(`⏳ Rate limit hit, waiting ${delay}ms before retry ${attempt}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (attempt === config.maxRetries) {
          throw new Error(`Failed after ${config.maxRetries} attempts: ${error.message}`);
        }

        const delay = config.retryDelay! * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms. Attempt ${attempt + 1}/${config.maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Unexpected error in generateContent');
  }
}

export const googleAIService = new GoogleAIService();

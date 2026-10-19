import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HttpService } from '@nestjs/axios';
import {PDFParse} from 'pdf-parse';
type VolcanoSummaryResult = {
  extractedText: string;
  summary: string;
};

@Injectable()
export class AppService {
  private apiKey: string;
  private defaultModel: string;
  constructor(private configService: ConfigService,private httpService: HttpService,) {
    this.apiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || "";
    this.defaultModel = this.configService.get<string>(
      'DASHSCOPE_DEFAULT_MODEL',
      'qwen-turbo',
    );
  }
  getHello(): string {
    return 'Hello World!';
  }

  healthCheck(): string {
    return 'OK';
  }

  async uploadPDF(
    fileData: Buffer | undefined,
    fileName?: string,
  ): Promise<VolcanoSummaryResult> {
    if (!fileData || fileData.length === 0) {
      throw new Error('No PDF file uploaded');
    }

    const extractedText = await this.extractPdfText(fileData);
      //使用langchain调用豆包大模型
    const response = await this.callOpenAI(extractedText);
    const summary = String(response?.content ?? extractedText);
    return {
      extractedText,
      summary,
    };
  }
  async extractPdfText(fileData: Buffer): Promise<string> {
    // 使用pdf-parse库提取PDF文本
    const pdfParse = new PDFParse({
      data: fileData,
    });
    const data = await pdfParse.getText();
    return data.text;
  }
  async callDashScope(prompt: string, model?: string) {
    //直接调用豆包大模型，添加重试机制
    const maxRetries = 2;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.httpService
          .post(
            'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            {
              model: model || this.defaultModel,
              messages: [{ role: 'user', content: prompt }],
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
              },
              timeout: 30000, // 设置30秒超时
            },
          )
          .toPromise();
        return response?.data.choices[0].message.content ?? response?.data.choices[0].text ?? '';
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // 重试之间添加延迟
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (attempt + 1)),
          );
        }
      }
    }
    throw lastError;
  }
  async callOpenAI(prompt: string, model?: string) {
    const endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const modelName = model || this.defaultModel || 'doubao-lite-4k';

    const response = await this.httpService
      .post(
        endpoint,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: `请总结以下 PDF 内容：\n\n${prompt}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 30000,
        },
      )
      .toPromise();

    const content =
      response?.data?.choices?.[0]?.message?.content ??
      response?.data?.choices?.[0]?.text ??
      '';

    return { content };
  }
}




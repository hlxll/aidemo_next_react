import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {PDFParse} from 'pdf-parse';
import PDFParser from 'pdf2json';
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
  async getHello(param: string): Promise<string> {
    return await this.callDashScope(param);
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
  // pdf解析文本
  async extractPdfText(fileData: Buffer): Promise<string> {
    // 使用pdf-parse库提取PDF文本
    const pdfParse = new PDFParse({
      data: fileData,
    });
    const data = await pdfParse.getText();
    return data.text;
  }


  async uploadPDFWithTables(
    fileData: Buffer | undefined,
    fileName?: string,
    password?:string
  ): Promise<VolcanoSummaryResult> {
    if (!fileData || fileData.length === 0) {
      throw new Error('No PDF file uploaded');
    }

    const extractedTables = await this.extractPdfTables(fileData, password);
    const extractedText = extractedTables.join('\n');
    return {
      extractedText: extractedText,
      summary: extractedText
    }
  }
  // pdf处理表格
  async extractPdfTables(fileData: Buffer, password?:string): Promise<string[]> {
    const text = await this.extractPdfTextWithPdf2Json(fileData, password);
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private extractPdfTextWithPdf2Json(fileData: Buffer, password?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true, password);

      pdfParser.on('pdfParser_dataError', (error) => {
        reject(error instanceof Error ? error : String(error.parserError));
      });

      pdfParser.on('pdfParser_dataReady', () => {
        try {
          // Pages数据存在pdf扫描到的每一页的文本块信息，包含x,y坐标和文本内容
          const pages = (pdfParser as any)?.data?.Pages ?? [];
          const textBlocks: { x: number; y: number; text: string }[] = pages
            .flatMap((page: any) => page?.Texts ?? [])
            .map((textItem: any) => {
              const text = (textItem?.R ?? [])
                .map((run: any) => run?.T ?? '')
                .join('');
              const value = text ? text.replace(/\s+/g, ' ').trim() : '';
              if (!value) {
                return null;
              }

              return {
                x: Number(textItem?.x ?? 0),
                y: Number(textItem?.y ?? 0),
                text: value,
              };
            })
            .filter((item: { x: number; y: number; text: string } | null): item is { x: number; y: number; text: string } => !!item);
          const orderedRows = AppService.groupPdfTextBlocks(textBlocks);
          resolve(orderedRows.join('\n'));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });

      pdfParser.parseBuffer(fileData);
    });
  }

  private normalizePdfTextRows(rawText: string): string[] {
    const rows = rawText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0);

    if (rows.length === 0) {
      return [];
    }

    return rows
      .map((row) => row.replace(/\s{2,}/g, '\t'))
      .filter((row) => row.length > 0);
  }

  static groupPdfTextBlocks(
    textBlocks: { x: number; y: number; text: string }[],
  ): string[] {
    if (textBlocks.length === 0) {
      return [];
    }

    const sorted = [...textBlocks].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: { y: number; cells: { x: number; text: string }[] }[] = [];

    for (const item of sorted) {
      let currentRow = rows.find((row) => Math.abs(row.y - item.y) <= 0.5);
      if (!currentRow) {
        currentRow = { y: item.y, cells: [] };
        rows.push(currentRow);
      }
      currentRow.cells.push({ x: item.x, text: item.text });
    }

    return rows
      .map((row) => ({
        cells: row.cells.sort((a, b) => a.x - b.x),
      }))
      .map((row) => row.cells.map((cell) => cell.text).join('\t'))
      .filter((row) => row.trim().length > 0);
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




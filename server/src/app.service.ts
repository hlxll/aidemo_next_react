import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {PDFParse} from 'pdf-parse';
import PDFParser from 'pdf2json';
import { createAgent, SystemMessage, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts"
import { getChromaClient } from './chroma/index.js';
import { getEmbedding } from './chroma/embedding.js';



type VolcanoSummaryResult = {
  extractedText: string;
  summary: string;
};
const client = getChromaClient();

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

  async transcribeAudio(
    fileData: Buffer | undefined,
    fileName?: string,
  ): Promise<string> {
    if (!fileData || fileData.length === 0) {
      throw new Error('No audio file uploaded');
    }

    const base64 = fileData.toString('base64');
    const ext = fileName?.split('.').pop() || 'webm';
    const format = ext === 'webm' ? 'webm' : ext === 'mp3' ? 'mp3' : ext === 'wav' ? 'wav' : 'webm';

    const endpoint = this.configService.get<string>('ARK_ASR_ENDPOINT')
      || this.configService.get<string>('ARK_ENDPOINT')
      || 'ep-20250401181332-xxxxx';

    const response = await this.httpService
      .post(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        {
          model: endpoint,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_audio',
                  input_audio: { data: base64, format },
                },
                {
                  type: 'text',
                  text: '请把这段语音中的内容识别出来，只返回识别到的文本，不要任何解释。',
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        },
      )
      .toPromise();

    return (
      response?.data?.choices?.[0]?.message?.content ??
      response?.data?.choices?.[0]?.text ??
      ''
    );
  }

  async callbackFun(body: any): Promise<ReadableStream<Uint8Array>> {
    // 1. 模型配置
    const model = new ChatOpenAI({
      model: process.env.DASHSCOPE_DEFAULT_MODEL, // 替换成你的推理接入点 ID
      configuration: {
        baseURL: process.env.DASHSCOPE_API_URL,
        apiKey: process.env.DASHSCOPE_API_KEY,
      },
    });

    // 2. 工具
    const getWeather = tool(
      async ({ city }) => {
        const data: Record<string, string> = {
          杭州: "杭州今天多云，20°C",
          北京: "北京今天晴，12°C",
          上海: "上海今天小雨，20°C",
        };
        console.log("获取天气", city)
        return data[city] ?? `${city} 的天气暂时无法获取`;
      },
      {
        name: "get_weather",
        description: "查询指定城市的当前天气",
        schema: z.object({
          city: z.string().describe("城市名称"),
        }),
      }
    );

    // 3. Agent
    const agent = createAgent({
      model,
      tools: [getWeather],
      systemPrompt: "你是一个智能助手，需要天气信息时调用 get_weather,不要编造。",
      checkpointer: new MemorySaver(),
    });

    // 4. 流式接口：返回 ReadableStream，由 controller 边读边写给前端
    const { message, threadId, tool: toolName } = body;
    if (!message) {
      throw new BadRequestException('缺少 message');
    }

    const config = {
      configurable: { thread_id: threadId || 'default' },
    };

    const newMessage = PromptTemplate.fromTemplate('{mes}');
    const newMes = await newMessage.format({ 
      mes: toolName === 'weather' ? message : `请解释：${message}`
    });
    const systemPrompt = new SystemMessage("本轮回答不超过20个字符");
    // updates 用来拿工具执行结果，messages 用来拿逐字回答
    const stream = (await agent.stream(
      { messages: [systemPrompt, { role: 'user', content: newMes }] },
      { ...config, streamMode: ['updates', 'messages'] },
    )) as AsyncIterable<[string, any]>;

    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const [mode, payload] of stream) {
            if (mode === 'messages') {
              // payload 形如 [messageChunk, metadata]，只写文本增量
              const chunk = payload?.[0];
              // 工具返回的 ToolMessage 会在 messages 模式里再出现一次，这里跳过，
              // 统一由下面的 updates 分支输出，避免重复
              if (chunk?.type === 'tool') {
                continue;
              }
              const text = chunk?.text ?? '';
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
              continue;
            }

            // mode === 'updates'：工具节点执行完后，ToolMessage 在 payload.tools.messages 中
            const toolMessages = payload?.tools?.messages;
            if (Array.isArray(toolMessages) && toolMessages.length > 0) {
              const toolMessage = toolMessages[toolMessages.length - 1];
              const content =
                typeof toolMessage?.content === 'string'
                  ? toolMessage.content
                  : JSON.stringify(toolMessage?.content ?? '');
              controller.enqueue(
                encoder.encode(
                  `\n[工具 ${toolMessage?.name ?? 'tool'}] ${content}\n`,
                ),
              );
            }
          }
        } catch (err: any) {
          controller.enqueue(encoder.encode(`\n[错误] ${err?.message ?? err}`));
        } finally {
          controller.close();
        }
      },
    });
  }

  async chromaLocalSearch(req: { query: string; nResults?: number }) {
    const { query, nResults = 4 } = req;
    if (!query?.trim()) {
      throw new BadRequestException('query 不能为空');
    }

    const collection = await client.getOrCreateCollection({
      name: 'knowledge',
    });

    // 重要：查询和入库必须共用同一个 embedding，否则向量空间不一致
    const queryVector = getEmbedding(query);

    const result = await collection.query({
      queryEmbeddings: [queryVector],
      nResults,
    });

    return {
      ids: result.ids?.[0] ?? [],
      documents: result.documents?.[0] ?? [],
      metadatas: result.metadatas?.[0] ?? [],
      distances: result.distances?.[0] ?? [],
    };
  }

  /**
   * 用自定义 embedding 生成向量并入库。
   * 依赖外部 ChromaDB server（默认 http://localhost:8000）。
   */
  async chromaLocalAddEmbedd(req: { text: string; id?: string }) {
    const { text, id } = req;
    if (!text?.trim()) {
      throw new BadRequestException('text 不能为空');
    }

    const collection = await client.getOrCreateCollection({
      name: 'knowledge',
    });

    const embedding = getEmbedding(text);
    const docId = id ?? `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await collection.add({
      ids: [docId],
      documents: [text],
      embeddings: [embedding],
      metadatas: [{ source: 'api', createdAt: Date.now() }],
    });

    return { id: docId, dimension: embedding.length };
  }
}




import { Controller, Get, Header, Post, Req, Request, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Logger, Lock } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets';
import type { Response } from 'express';
import { WebSocket } from 'ws';
import type { RawData } from 'ws';
import { AppService } from './app.service.js';
import { Readable } from 'stream';
import path from 'path';
/** 前端 AudioWorklet 统一转成 16k / 单声道 / 16bit PCM */
const AUDIO_SAMPLE_RATE = 16000;
/** 超过这个静音时长就认为一句话说完，触发识别 */
const SILENCE_MS = 900;
/** 单次识别最多累积 30 秒音频，防止连续说话时内存无限增长 */
const MAX_BUFFER_BYTES = AUDIO_SAMPLE_RATE * 2 * 30;

/** 给裸 PCM 加 44 字节 WAV 头，才能交给语音识别接口 */
function toWav(pcm: Buffer, sampleRate = AUDIO_SAMPLE_RATE): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt 块长度
  header.writeUInt16LE(1, 20); // PCM 格式
  header.writeUInt16LE(1, 22); // 单声道
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // 字节率
  header.writeUInt16LE(2, 32); // 块对齐
  header.writeUInt16LE(16, 34); // 位深
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

interface AudioSession {
  chunks: Buffer[];
  bytes: number;
  idleTimer: NodeJS.Timeout | null;
  /** 串行化识别任务，避免并发调用语音接口 */
  queue: Promise<void>;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 互斥锁：locked 表示锁被占用，waiters 存放排队请求的放行函数（FIFO）
  private requestChain: Promise<void> = Promise.resolve();
  private locked = false;
  private waiters: Array<() => void> = [];


  // 这个锁是利用Promise的链式.then调用方法，如果一直有后续要加锁的方法，一直在后续.then调用方法，如果一直有后续要加锁的方法.
  // 一直在后续加，前一个加锁的执行了保存进去的Promise的resolve，才能到下一个锁。
  private nextAcquireLock(): Promise<() => void> {
    let release: () => void;
    // 1. 创建一个"待解锁"的 Promise，resolve 函数就是钥匙
    const next = new Promise<void>((resolve) => { release = resolve; });

    //下面两步只是将所有使用锁的await挂到链尾，等待prev完成，再执行next
    // 2. 记住当前链尾
    const prev = this.requestChain;
    // 3. 把 next 挂到链尾，更新链尾指针
    this.requestChain = prev.then(() => next);
    // 4. 返回 prev，调用者等 prev 完成就拿到锁，
    return prev.then(() => release);
  }
  private acquireLock(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      let released = false;

      const unlock = () => {
        if (released) return; // 重复释放直接忽略，避免同时放行两个请求
        released = true;

        const next = this.waiters.shift();
        if (next) {
          next(); // 锁直接交接给队首，locked 保持 true
        } else {
          this.locked = false; // 无人排队，真正释放
        }
      };

      if (this.locked) {
        // 锁已被占用，排队等待
        this.waiters.push(() => resolve(unlock));
      } else {
        this.locked = true;
        resolve(unlock);
      }
    });
  }
  @Post('/uploadtxt')
  async uploadText(@Req() request: any, @Res() response: Response){
    const memoryUsage = process.memoryUsage();
    const readSteram = new ReadableStream({
      start(controller) {
        controller.enqueue(request.body.text);
        controller.close();
      },
    });
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    Readable.fromWeb(readSteram as any).pipe(response);
  }

  @Post()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getHello(@Request() request: any, @Res() response: Response): Promise<void> {
    const message = await this.appService.getHello(request.body.param);
    const chunks = message.split('');

    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    for (const chunk of chunks) {
      response.write(chunk);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    response.end();
  }

  @Post('/upload')
  @UseInterceptors(FilesInterceptor('file'))
  //UploadedFiles,接收上传文件
  async uploadFile(
    @UploadedFiles() files: any[],
    @Request() req: any,
    @Res() response: Response,
  ) {
    try {
      if (!files?.length) {
        throw new Error('No PDF file uploaded');
      }
      const partIndex = (name = '') => Number(name.split('.part').pop()) || 0;
      const ordered = [...files].sort(
        (a, b) => partIndex(a.originalname) - partIndex(b.originalname),
      );
      const merged: Buffer = Buffer.concat(
        ordered.map((f) => f.buffer as Buffer),
      );

      console.log(
        `收到 ${ordered.length} 个分片，合并后 ${merged.length} 字节`,
      );
      const fileName = ordered[0]?.originalname?.replace(/\.part\d+$/, '')
      response.setHeader('Content-Type', 'application/json');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      // 上传pdf，解析内容，返回结果
      if(fileName?.endsWith('.pdf')){
        const result = await this.appService.uploadPDFWithTables(merged, fileName, req.body.password);
        response.json({
          message: 'File uploaded successfully',
          filename: fileName,
          size: merged.length,
          extractedText: result.extractedText,
          summary: result.summary,
        });  
      }else{
        // 上传docx，解析内容，拆分段落
        const result = await this.appService.uploadDOCX(merged, fileName);
        response.status(200).json({
          message: 'File uploaded successfully',
          filename: fileName,
          size: merged.length,
          chunks: result,
        });  
      }
      
    } catch (error) {
      response.status(400).json({
        message: error,
      });
    }
  }

  @Post('/chat')
  async chat(@Request() req: any, @Res() response: Response) {
    try {
      const stream = await this.appService.callbackFun(req.body);

      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Cache-Control', 'no-cache, no-transform');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no');

      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(value);
      }
    } catch (error: any) {
      if (response.headersSent) {
        response.write(`\n[错误] ${error?.message ?? error}`);
      } else {
        response.status(400).json({ message: error?.message ?? String(error) });
      }
    } finally {
      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  @Post('/getChatHistory')
  async getChatHistory(@Request() req: any, @Res() response: Response) {
    try {
      const history = await this.appService.getChatHistory(req.body.threadId);
      response.json({ history });
    } catch (error: any) {
      response.status(400).json({
        message: error?.message || String(error),
      });
    }
  }


  @Post('/audio')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribe(@UploadedFile() file: any, @Res() response: Response) {
    try {
      const text = await this.appService.transcribeAudio(
        file?.buffer,
        file?.originalname,
      );
      response.json({ text });
    } catch (error: any) {
      response.status(400).json({
        message: error?.message || String(error),
      });
    }
  }

  // 知识库查询
  @Post('/search')
  async search(@Request() req: any, @Res() response: Response) {
    try {
      const result = await this.appService.chromaLocalSearch(req.body);
      response.json({ result });
    } catch (error: any) {
      response.status(400).json({
        message: error?.message || String(error),
      });
    }
  }

  // 用自定义 embedding 入库
  @Post('/addEmbedd')
  async addEmbedd(@Request() req: any, @Res() response: Response) {
    // try {
      const result = await this.appService.chromaLocalAddEmbedd(req.body);
      response.status(200).json({ message: '添加成功', ...result });
    // } catch (error: any) {
      // response.status(400).json({ message: error?.message || String(error) });
    // }
  }
  // 返回一个完整的 three.js HTML 页面，前端用 iframe 嵌入
  @Get('/three')
  async three(@Res() response: Response) {
    response.setHeader('Cache-Control', 'no-cache'); // 禁用缓存 
    // 项目是 ESM，没有 __dirname，用 import.meta.dirname
    // nest build 会把 src/component/*.html 拷到 dist/component/，所以按当前文件目录找
    response.sendFile(path.join(import.meta.dirname, 'component/three.html'));
  }

  // /three 页面里的 ./image_57.png 会解析成 /image_57.png，这里把本地图片返回给它
  @Get('/image_57.png')
  async spriteImage(@Res() response: Response) {
    response.sendFile(path.join(import.meta.dirname, 'component/image_57.png'));
  }
}

/**
 * 语音流 WebSocket：前端持续推送 16bit PCM 二进制帧，
 * 服务端按静音间隔拼接成 WAV 后调用识别接口，把文本回推给前端。
 */
@WebSocketGateway({ path: '/audio-stream' })
export class AudioStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AudioStreamGateway.name);
  private readonly sessions = new Map<WebSocket, AudioSession>();

  constructor(private readonly appService: AppService) {}

  handleConnection(client: WebSocket) {
    const session: AudioSession = {
      chunks: [],
      bytes: 0,
      idleTimer: null,
      queue: Promise.resolve(),
    };
    this.sessions.set(client, session);
    this.logger.log('音频流连接建立');

    client.on('message', (raw: RawData, isBinary: boolean) => {
      // 二进制帧 = PCM 数据，直接拼接到该连接的缓冲区
      if (isBinary) {
        const chunk = Array.isArray(raw)
          ? Buffer.concat(raw)
          : Buffer.from(raw as Buffer);
        session.chunks.push(chunk);
        session.bytes += chunk.length;

        // 攒满上限先识别一次，避免长语音把内存撑爆
        if (session.bytes >= MAX_BUFFER_BYTES) {
          void this.flush(client, session);
        } else {
          this.resetIdleTimer(client, session);
        }
        return;
      }

      // 文本帧用于控制：end 表示用户主动结束，立即识别剩余音频并回 done
      if (raw.toString().trim() === 'end') {
        this.logger.log(`收到 end，剩余 ${session.bytes} 字节，开始识别`);
        void this.flush(client, session, true);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    const session = this.sessions.get(client);
    if (session?.idleTimer) clearTimeout(session.idleTimer);
    // 客户端不打招呼就断开时，缓冲区里的音频只能丢弃（连接已无法回推结果）
    if (session && session.bytes > 0) {
      this.logger.warn(
        `连接关闭时丢弃未识别音频 ${session.bytes} 字节（客户端未发送 end）`,
      );
    }
    this.sessions.delete(client);
  }

  /** 每收到一帧就重置静音计时，静音超时即认为一句话结束 */
  private resetIdleTimer(client: WebSocket, session: AudioSession) {
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => {
      session.idleTimer = null;
      void this.flush(client, session);
    }, SILENCE_MS);
  }

  /**
   * 把当前缓冲区拼成一段 WAV 送去识别。
   * final=true 时会在所有排队任务结束后回一条 { clear: true }，
   * 前端据此确认「最后一段也说完了」，收到后才关闭连接。
   */
  private async flush(
    client: WebSocket,
    session: AudioSession,
    final = false,
  ): Promise<void> {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.idleTimer = null;
    }

    const pcm = Buffer.concat(session.chunks);
    session.chunks = [];
    session.bytes = 0;

    if (pcm.length > 0) {
      session.queue = session.queue.then(async () => {
        try {
          const text = await this.appService.transcribeAudio(
            toWav(pcm),
            'audio.wav',
          );
          this.logger.log(`识别完成 ${pcm.length} 字节 → ${text}`);
          if (text && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ text }));
          }
        } catch (error: any) {
          this.logger.error(`识别失败: ${error?.message ?? error}`);
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ error: error?.message ?? String(error) }),
            );
          }
        }
      });
    }

    if (final) {
      session.queue = session.queue.then(() => {
        if (client.readyState === WebSocket.OPEN) {
          // clear 表示这段音频已全部识别完毕，前端收到后才关闭连接
          client.send(JSON.stringify({ clear: true }));
        }
      });
    }

    await session.queue;
  }
}
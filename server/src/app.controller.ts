import { Controller, Header, Post, Req, Request, Res, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
        response.json({
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
    try {
      const result = await this.appService.chromaLocalAddEmbedd(req.body);
      response.status(200).json({ message: '添加成功', ...result });
    } catch (error: any) {
      response.status(400).json({ message: error?.message || String(error) });
    }
  }
}

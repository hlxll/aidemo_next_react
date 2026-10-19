import { Controller, Header, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getHello(@Res() response: Response): Promise<void> {
    const message = this.appService.getHello();
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Res() response: Response) {
    try {
      const result = await this.appService.uploadPDF(file?.buffer, file?.originalname);
      response.json({
        message: 'File uploaded successfully',
        filename: file?.originalname,
        size: file?.size,
        extractedText: result.extractedText,
        summary: result.summary,
      });
    } catch (error) {
      response.status(400).json({
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { describe, expect, it, vi } from 'vitest';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should stream "Hello World!" to the response body', async () => {
      const response = {
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      };

      await appController.getHello(response as any);

      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; charset=utf-8',
      );
      expect(response.write).toHaveBeenCalled();
      expect(response.end).toHaveBeenCalled();
    });
  });
});

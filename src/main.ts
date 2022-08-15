import helmet from 'helmet';
import mongoose from 'mongoose';
import { accessibleRecordsPlugin } from '@casl/mongoose';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  mongoose.plugin(accessibleRecordsPlugin);
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(configService.get<number>('PORT') || 3000);
}

bootstrap();

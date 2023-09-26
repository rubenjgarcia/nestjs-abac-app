import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IAMModule } from './iam/iam.module';
import { AutomapperModule } from '@timonmasberg/automapper-nestjs';
import { classes } from '@automapper/classes';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.localhost', '.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URI'),
      }),
    }),
    AutomapperModule.forRoot({
      strategyInitializer: classes(),
    }),
    IAMModule,
  ],
})
export class AppModule {}

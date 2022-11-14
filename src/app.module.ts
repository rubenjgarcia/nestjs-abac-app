import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IAMModule } from './iam/iam.module';
import { FoosModule } from './foos/foos.module';
import { WersModule } from './wers/wers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URI'),
      }),
    }),
    IAMModule,
    FoosModule,
    WersModule,
  ],
})
export class AppModule {}

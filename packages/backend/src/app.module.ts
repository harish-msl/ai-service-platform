import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { UsageModule } from './modules/usage/usage.module';
import { HealthModule } from './modules/health/health.module';
import { SchemaModule } from './modules/schema/schema.module';
import { AiModule } from './modules/ai/ai.module';
import { WeaviateModule } from './modules/weaviate/weaviate.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              }
            : undefined,
      },
    }),

    // Database
    PrismaModule,

    // Bull Queue for background jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: false, // Keep failed jobs for debugging
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    ProjectsModule,
    ApiKeysModule,
    UsageModule,
    HealthModule,
    SchemaModule,
    AiModule,
    WeaviateModule,
    
    // Future modules:
    // SchemaModule,
    // AIModule (Query Generation, Chatbot, Analytics),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

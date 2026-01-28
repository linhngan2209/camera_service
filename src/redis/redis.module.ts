import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_SESSION', 
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          db: 1, 
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_SESSION'],
})
export class RedisModule {}
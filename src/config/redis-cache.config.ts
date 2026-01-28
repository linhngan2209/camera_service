import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const redisCacheConfig: CacheModuleAsyncOptions = {
    isGlobal: true,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        url: `redis://${configService.get<string>('REDIS_HOST') || 'localhost'}:${configService.get<number>('REDIS_PORT') || 6379}`,
        ttl: 300 * 1000, 
        max: 100,
    }),
};
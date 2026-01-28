import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USER', 'root'),
  password: configService.get<string>('DB_PASSWORD', 'Tan@26082000'),
  database: configService.get<string>('DB_NAME', 'camera_db'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  timezone: '+9:00',
});
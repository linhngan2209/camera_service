import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrangePiEntity } from 'src/entities/orange_pi.entity';
import { CameraEntity } from 'src/entities/camera.entity';
import { PiService } from './pi.service';
import { PiController } from './pi.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PiGateway } from './pi.gateway';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrangePiEntity,
      CameraEntity,
    ]),
    RedisModule,
  ],
  providers: [PiService,  PiGateway,],
  controllers: [PiController],
  exports: [PiService],
})
export class PiModule { }
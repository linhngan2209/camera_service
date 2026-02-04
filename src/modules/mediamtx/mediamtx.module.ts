import { Module } from '@nestjs/common';
import { MediaMtxService } from './mediamtx.service';

@Module({
    providers: [MediaMtxService],
    exports: [MediaMtxService],
})
export class MediaMtxModule {}
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { PiService } from './pi.service';

@Controller('pi')
export class PiController {
    constructor(private readonly piService: PiService) { }

    @Post()
    create(@Body() body: { name: string; hardwareId: number; tailscaleIp?: string; domain?: string }) {
        return this.piService.createPi(body);
    }

    @Post(':piId/camera')
    addCamera(
        @Param('piId') piId: string,
        @Body() body: { name: string; pathMain: string; pathSub?: string },
    ) {
        return this.piService.addCamera(piId, body);
    }

    @Get('by-hardware/:hardwareId')
    getByHardwareId(@Param('hardwareId') hardwareId: number) {
        return this.piService.getPiByHardwareId(hardwareId);
    }

    @Post('watch')
    watch(@Body() body: { hardwareId: number; viewerId: string }) {
        return this.piService.watchPi(body.hardwareId, body.viewerId);
    }

    @Post('stop')
    stop(@Body() body: { hardwareId: number; viewerId: string }) {
        return this.piService.stopPi(body.hardwareId, body.viewerId);
    }

    @Put(':hardwareId/status')
    updateStatus(
        @Param('hardwareId') hardwareId: number,
        @Body() body: { status: 'online' | 'offline' },
    ) {
        return this.piService.updatePiStatus(hardwareId, body.status);
    }

    @Get(':hardwareId/cameras')
    getCameras(@Param('hardwareId') hardwareId: string) {
        return this.piService.getPiCameras(+hardwareId);
    }

    @Get(':hardwareId/viewers')
    getViewers(@Param('hardwareId') hardwareId: number) {
        return this.piService.getPiViewers(hardwareId);
    }

    @Post(':hardwareId/heartbeat')
    heartbeat(@Param('hardwareId') hardwareId: number) {
        return this.piService.updatePiStatus(hardwareId, 'online');
    }

    @Post(':hardwareId/heartbeat-viewer/:viewerId')
    heartbeatWithViewer(
        @Param('hardwareId') hardwareId: number,
        @Param('viewerId') viewerId: string,
    ) {
        return this.piService.heartbeatWithViewer(hardwareId, viewerId);
    }

    @Delete('session/:hardwareId/:viewerId')
    deleteSession(
        @Param('hardwareId') hardwareId: number,
        @Param('viewerId') viewerId: string,
    ) {
        return this.piService.stopPi(hardwareId, viewerId);
    }

    @Post(':id/reload')
    async reload(@Param('id') id: string) {
        return this.piService.reloadFromPi(id);
    }
}
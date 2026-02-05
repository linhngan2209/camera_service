import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
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

    @Get()
    getAll() {
        return this.piService.getAllPis();
    }

    @Get(':id')
    getById(@Param('id') id: string) {
        return this.piService.getPiById(id);
    }

    @Get('by-hardware/:hardwareId')
    getByHardwareId(@Param('hardwareId') hardwareId: number) {
        return this.piService.getPiByHardwareId(hardwareId);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() body: { name?: string; tailscaleIp?: string; domain?: string, hardwareId?: number },
    ) {
        return this.piService.updatePi(id, body);
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

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.piService.deletePi(id);
    }

    @Delete('camera/:cameraId')
    deleteCamera(@Param('cameraId') cameraId: string) {
        return this.piService.deleteCamera(cameraId);
    }

    @Post(':id/reload')
    async reload(@Param('id') id: string) {
        return this.piService.reloadFromPi(id);
    }
}
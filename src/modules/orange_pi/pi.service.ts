import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CameraEntity } from 'src/entities/camera.entity';
import { OrangePiEntity } from 'src/entities/orange_pi.entity';
import axios from 'axios';

@Injectable()
export class PiService {
    constructor(
        @InjectRepository(OrangePiEntity)
        private readonly piRepo: Repository<OrangePiEntity>,

        @InjectRepository(CameraEntity)
        private readonly cameraRepo: Repository<CameraEntity>,
    ) { }

    // ==================== PI MANAGEMENT ====================

    async getAllPis() {
        const pis = await this.piRepo.find({
            relations: ['cameras'],
            order: {
                createdAt: 'DESC'
            }
        });

        return {
            success: true,
            total: pis.length,
            pis: pis.map(pi => ({
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
                tailscaleIp: pi.tailscaleIp,
                domain: pi.domain,
                status: pi.status,
                lastSeen: pi.lastSeen,
                createdAt: pi.createdAt,
                cameras: pi.cameras ? pi.cameras.map(cam => ({
                    id: cam.id,
                    name: cam.name,
                    pathMain: cam.pathMain,
                    pathSub: cam.pathSub,
                    createdAt: cam.createdAt,
                })) : [],
            })),
            timestamp: new Date().toISOString(),
        };
    }

    async getPiById(id: string) {
        const pi = await this.piRepo.findOne({
            where: { id },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with ID '${id}' not found`);
        }

        return {
            success: true,
            pi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
                tailscaleIp: pi.tailscaleIp,
                domain: pi.domain,
                status: pi.status,
                lastSeen: pi.lastSeen,
                createdAt: pi.createdAt,
                cameras: pi.cameras ? pi.cameras.map(cam => ({
                    id: cam.id,
                    name: cam.name,
                    pathMain: cam.pathMain,
                    pathSub: cam.pathSub,
                    createdAt: cam.createdAt,
                })) : [],
            },
            timestamp: new Date().toISOString(),
        };
    }

    async createPi(data: {
        name: string;
        hardwareId: number;
        tailscaleIp?: string;
        domain?: string;
    }) {
        const existing = await this.piRepo.findOne({
            where: { hardwareId: data.hardwareId }
        });

        if (existing) {
            throw new BadRequestException(`Pi with hardwareId '${data.hardwareId}' already exists`);
        }

        const pi = this.piRepo.create({
            name: data.name,
            hardwareId: data.hardwareId,
            tailscaleIp: data.tailscaleIp,
            domain: data.domain,
            status: 'offline',
        });

        const savedPi = await this.piRepo.save(pi);

        return {
            success: true,
            message: 'Pi created successfully',
            pi: {
                id: savedPi.id,
                name: savedPi.name,
                hardwareId: savedPi.hardwareId,
                tailscaleIp: savedPi.tailscaleIp,
                domain: savedPi.domain,
                status: savedPi.status,
                createdAt: savedPi.createdAt,
            },
            timestamp: new Date().toISOString(),
        };
    }

    async getPiByHardwareId(hardwareId: number) {
        const pi = await this.piRepo.findOne({
            where: { hardwareId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with hardwareId '${hardwareId}' not found`);
        }

        return {
            success: true,
            pi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
                tailscaleIp: pi.tailscaleIp,
                domain: pi.domain,
                status: pi.status,
                lastSeen: pi.lastSeen,
                cameras: pi.cameras ? pi.cameras.map(cam => ({
                    id: cam.id,
                    name: cam.name,
                    pathMain: cam.pathMain,
                    pathSub: cam.pathSub,
                })) : [],
            },
            timestamp: new Date().toISOString(),
        };
    }

    async updatePi(id: string, data: {
        name?: string;
        tailscaleIp?: string;
        domain?: string;
    }) {
        const pi = await this.piRepo.findOne({ where: { id } });

        if (!pi) {
            throw new NotFoundException(`Pi with ID '${id}' not found`);
        }

        // Update fields if provided
        if (data.name !== undefined) pi.name = data.name;
        if (data.tailscaleIp !== undefined) pi.tailscaleIp = data.tailscaleIp;
        if (data.domain !== undefined) pi.domain = data.domain;

        const updatedPi = await this.piRepo.save(pi);

        return {
            success: true,
            message: 'Pi updated successfully',
            pi: {
                id: updatedPi.id,
                name: updatedPi.name,
                hardwareId: updatedPi.hardwareId,
                tailscaleIp: updatedPi.tailscaleIp,
                domain: updatedPi.domain,
                status: updatedPi.status,
            },
            timestamp: new Date().toISOString(),
        };
    }

    async updatePiStatus(hardwareId: number, status: 'online' | 'offline') {
        const pi = await this.piRepo.findOne({
            where: { hardwareId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with hardwareId '${hardwareId}' not found`);
        }

        pi.status = status;
        pi.lastSeen = new Date();

        await this.piRepo.save(pi);

        return {
            success: true,
            message: `Pi status updated to '${status}'`,
            pi: {
                hardwareId: pi.hardwareId,
                name: pi.name,
                status: pi.status,
                lastSeen: pi.lastSeen,
            },
            timestamp: new Date().toISOString(),
        };
    }

    async getPiCameras(hardwareId: number) {
        const pi = await this.piRepo.findOne({
            where: { hardwareId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with hardwareId '${hardwareId}' not found`);
        }

        return {
            success: true,
            pi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
                status: pi.status,
            },
            cameras: pi.cameras ? pi.cameras.map(cam => ({
                id: cam.id,
                name: cam.name,
                pathMain: cam.pathMain,
                pathSub: cam.pathSub,
                createdAt: cam.createdAt,
            })) : [],
            total: pi.cameras ? pi.cameras.length : 0,
            timestamp: new Date().toISOString(),
        };
    }

    async deletePi(id: string) {
        const pi = await this.piRepo.findOne({
            where: { id },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with ID '${id}' not found`);
        }

        // Delete all cameras first (if any)
        if (pi.cameras && pi.cameras.length > 0) {
            await this.cameraRepo.remove(pi.cameras);
        }

        // Delete Pi
        await this.piRepo.remove(pi);

        return {
            success: true,
            message: 'Pi and all its cameras deleted successfully',
            deletedPi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
            },
            deletedCameras: pi.cameras ? pi.cameras.length : 0,
            timestamp: new Date().toISOString(),
        };
    }

    // ==================== CAMERA MANAGEMENT ====================

    async addCamera(piId: string, data: {
        name: string;
        pathMain: string;
        pathSub?: string;
    }) {
        const pi = await this.piRepo.findOne({ where: { id: piId } });
        if (!pi) {
            throw new NotFoundException(`Pi with ID '${piId}' not found`);
        }

        const existingCamera = await this.cameraRepo.findOne({
            where: { pathMain: data.pathMain },
        });

        if (existingCamera) {
            throw new BadRequestException(`Camera with pathMain '${data.pathMain}' already exists`);
        }

        const camera = this.cameraRepo.create({
            ...data,
            pi: pi,
        });

        const savedCamera = await this.cameraRepo.save(camera);

        return {
            success: true,
            message: 'Camera added successfully',
            camera: {
                id: savedCamera.id,
                name: savedCamera.name,
                pathMain: savedCamera.pathMain,
                pathSub: savedCamera.pathSub,
                piId: pi.id,
                piName: pi.name,
                createdAt: savedCamera.createdAt,
            },
            timestamp: new Date().toISOString(),
        };
    }

    async deleteCamera(cameraId: string) {
        const camera = await this.cameraRepo.findOne({
            where: { id: cameraId },
            relations: ['pi'],
        });

        if (!camera) {
            throw new NotFoundException(`Camera with ID '${cameraId}' not found`);
        }

        const cameraInfo = {
            id: camera.id,
            name: camera.name,
            pathMain: camera.pathMain,
            piId: camera.pi.id,
            piName: camera.pi.name,
        };

        await this.cameraRepo.remove(camera);

        return {
            success: true,
            message: 'Camera deleted successfully',
            deletedCamera: cameraInfo,
            timestamp: new Date().toISOString(),
        };
    }

    // ==================== SYNC FROM PI ====================

    async reloadFromPi(piId: string) {
        const pi = await this.piRepo.findOne({
            where: { id: piId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi with ID '${piId}' not found`);
        }

        const targetIp = pi.tailscaleIp || pi.domain;

        if (!targetIp) {
            throw new BadRequestException(
                `Pi '${pi.name}' has no Tailscale IP or domain configured`
            );
        }

        try {
            const res = await axios.get(
                `http://${targetIp}:8000/api/get-list-cameras`,
                { timeout: 5000 }
            );

            const status = res.data;

            // Update Pi status
            pi.status = 'online';
            pi.lastSeen = new Date();
            await this.piRepo.save(pi);

            // Delete old cameras (if any)
            if (pi.cameras && pi.cameras.length > 0) {
                await this.cameraRepo.remove(pi.cameras);
            }

            const newCameras: CameraEntity[] = [];

            // Create new cameras from received data
            if (status.cameras && Array.isArray(status.cameras)) {
                for (const camData of status.cameras) {
                    const camera = this.cameraRepo.create({
                        name: camData.name || `Camera ${camData.id}`,
                        pathMain: `/${camData.id}`,
                        pathSub: `/${camData.id}_sub`,
                        pi: pi,
                    });

                    const saved = await this.cameraRepo.save(camera);
                    newCameras.push(saved);
                }
            }

            return {
                success: true,
                message: 'Cameras synced from Pi successfully',
                pi: {
                    id: pi.id,
                    name: pi.name,
                    hardwareId: pi.hardwareId,
                    status: pi.status,
                    lastSeen: pi.lastSeen,
                },
                cameras: {
                    total: newCameras.length,
                    synced: newCameras.length,
                    list: newCameras.map(cam => ({
                        id: cam.id,
                        name: cam.name,
                        pathMain: cam.pathMain,
                        pathSub: cam.pathSub,
                    })),
                },
                syncedAt: new Date().toISOString(),
            };

        } catch (error) {
            // Mark Pi as offline if connection fails
            pi.status = 'offline';
            await this.piRepo.save(pi);

            throw new BadRequestException(
                `Cannot connect to Pi '${pi.name}' at ${targetIp}:8000. ` +
                `Error: ${error.message}`
            );
        }
    }

    // ==================== HELPER METHODS ====================

    async register(piId: string) {
        await this.piRepo.update(
            { id: piId },
            {
                status: 'online',
                lastSeen: new Date(),
            },
        );
    }

    async heartbeat(piId: string) {
        await this.piRepo.update(
            { id: piId },
            {
                status: 'online',
                lastSeen: new Date(),
            },
        );
    }

    async offline(piId: string) {
        await this.piRepo.update(
            { id: piId },
            { status: 'offline' },
        );
    }
}
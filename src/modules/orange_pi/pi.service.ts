import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
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

        @Inject('REDIS_SESSION')
        private readonly redis: Redis,
    ) { }

    // ==================== PI MANAGEMENT ====================

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
            throw new BadRequestException(`Pi với hardwareId '${data.hardwareId}' đã tồn tại`);
        }

        const pi = this.piRepo.create({
            name: data.name,
            hardwareId: data.hardwareId,
            tailscaleIp: data.tailscaleIp,
            domain: data.domain,
            status: 'offline',
        });

        return await this.piRepo.save(pi);
    }

    async getPiByHardwareId(hardwareId: number) {
        const pi = await this.piRepo.findOne({
            where: { hardwareId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi với hardwareId '${hardwareId}' không tồn tại`);
        }

        return pi;
    }

    async updatePiStatus(hardwareId: number, status: 'online' | 'offline') {
        const pi = await this.getPiByHardwareId(hardwareId);

        pi.status = status;
        pi.lastSeen = new Date();

        await this.piRepo.save(pi);

        return {
            success: true,
            hardwareId,
            status,
            lastSeen: pi.lastSeen,
        };
    }

    async getPiCameras(hardwareId: number) {
        const pi = await this.getPiByHardwareId(hardwareId);
        return pi.cameras;
    }

    async addCamera(piId: string, data: {
        name: string;
        pathMain: string;
        pathSub?: string;
    }) {
        // Kiểm tra Pi tồn tại
        const pi = await this.piRepo.findOne({ where: { id: piId } });
        if (!pi) {
            throw new NotFoundException(`Pi với ID '${piId}' không tồn tại`);
        }

        // Kiểm tra pathMain đã tồn tại chưa
        const existingCamera = await this.cameraRepo.findOne({
            where: { pathMain: data.pathMain },
        });

        if (existingCamera) {
            throw new BadRequestException(`Camera với pathMain '${data.pathMain}' đã tồn tại`);
        }

        const camera = this.cameraRepo.create({
            ...data,
            pi: pi,
        });

        return await this.cameraRepo.save(camera);
    }

    // ==================== VIEWER SESSION (REDIS) ====================

    private getViewerKey(piId: string, viewerId: string): string {
        return `pi:${piId}:viewer:${viewerId}`;
    }

    private async countViewers(piId: string): Promise<number> {
        const pattern = `pi:${piId}:viewer:*`;
        const keys = await this.redis.keys(pattern);
        return keys.length;
    }

    async watchPi(hardwareId: number, viewerId: string) {
        const pi = await this.getPiByHardwareId(hardwareId);

        // Kiểm tra Pi có online không
        if (pi.status !== 'online') {
            throw new BadRequestException(`Pi '${pi.name}' đang offline`);
        }

        // Kiểm tra Pi có camera nào không
        if (pi.cameras.length === 0) {
            throw new BadRequestException(`Pi '${pi.name}' chưa có camera nào`);
        }

        // Thêm viewer vào Redis với TTL 30s
        const viewerKey = this.getViewerKey(pi.id, viewerId);
        await this.redis.setex(viewerKey, 30, 'active');

        // Lấy số viewer hiện tại
        const viewerCount = await this.countViewers(pi.id);

        // Tạo stream URLs
        const mediamtxHost = process.env.MEDIAMTX_HOST || 'localhost';
        const mediamtxPort = process.env.MEDIAMTX_WEBRTC_PORT || '8889';

        return {
            success: true,
            pi: {
                id: pi.id,
                hardwareId: pi.hardwareId,
                name: pi.name,
                status: pi.status,
                tailscaleIp: pi.tailscaleIp,
                domain: pi.domain,
            },
            viewer: {
                id: viewerId,
                sessionStarted: new Date().toISOString(),
                ttl: 30,
            },
            cameras: pi.cameras.map(cam => ({
                id: cam.id,
                name: cam.name,
                streams: {
                    main: {
                        path: cam.pathMain,
                        url: `wss://${mediamtxHost}:${mediamtxPort}/${cam.pathMain}`,
                    },
                    sub: cam.pathSub ? {
                        path: cam.pathSub,
                        url: `wss://${mediamtxHost}:${mediamtxPort}/${cam.pathSub}`,
                    } : null,
                },
            })),
            statistics: {
                activeViewers: viewerCount,
                totalCameras: pi.cameras.length,
            },
            timestamp: new Date().toISOString(),
        };
    }

    async stopPi(hardwareId: number, viewerId: string) {
        const pi = await this.getPiByHardwareId(hardwareId);

        const viewerKey = this.getViewerKey(pi.id, viewerId);

        // Xóa viewer khỏi Redis
        const deleted = await this.redis.del(viewerKey);

        // Kiểm tra còn viewer nào không
        const remainingViewers = await this.countViewers(pi.id);

        return {
            success: deleted > 0,
            pi: {
                id: pi.id,
                hardwareId: pi.hardwareId,
                name: pi.name,
            },
            viewerId,
            remainingViewers,
            timestamp: new Date().toISOString(),
        };
    }

    async getPiViewers(hardwareId: number) {
        const pi = await this.getPiByHardwareId(hardwareId);

        const pattern = `pi:${pi.id}:viewer:*`;
        const keys = await this.redis.keys(pattern);

        const viewers = await Promise.all(
            keys.map(async (key) => {
                const viewerId = key.split(':')[3];
                const ttl = await this.redis.ttl(key);

                return {
                    viewerId,
                    ttl,
                    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
                };
            })
        );

        return {
            pi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
            },
            totalViewers: viewers.length,
            viewers,
            timestamp: new Date().toISOString(),
        };
    }

    // ==================== ADDITIONAL METHODS ====================

    // For heartbeat với viewerId (nếu cần)
    async heartbeatWithViewer(hardwareId: number, viewerId: string) {
        const pi = await this.getPiByHardwareId(hardwareId);

        const viewerKey = this.getViewerKey(pi.id, viewerId);

        // Kiểm tra viewer có tồn tại không
        const exists = await this.redis.exists(viewerKey);
        if (!exists) {
            throw new NotFoundException(`Viewer '${viewerId}' không đang xem Pi này hoặc đã hết hạn`);
        }

        // Reset TTL về 30s
        await this.redis.expire(viewerKey, 30);

        const ttl = await this.redis.ttl(viewerKey);

        return {
            success: true,
            viewerId,
            pi: {
                id: pi.id,
                name: pi.name,
                hardwareId: pi.hardwareId,
            },
            ttl,
            expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
            timestamp: new Date().toISOString(),
        };
    }


    async reloadFromPi(piId: string) {
        const pi = await this.piRepo.findOne({
            where: { id: piId },
            relations: ['cameras'],
        });

        if (!pi) {
            throw new NotFoundException(`Pi với ID '${piId}' không tồn tại`);
        }

        const targetIp = pi.tailscaleIp || pi.domain;

        if (!targetIp) {
            throw new BadRequestException(
                `Pi '${pi.name}' chưa có Tailscale IP hoặc domain`
            );
        }

        try {
            const res = await axios.get(
                `http://${targetIp}:8000/get-list-cameras`,
                { timeout: 5000 }
            );

            const status = res.data;
            await this.piRepo.save(pi);

            if (pi.cameras && pi.cameras.length > 0) {
                await this.cameraRepo.remove(pi.cameras);
            }

            const newCameras: CameraEntity[] = [];

            if (status.cameras && Array.isArray(status.cameras)) {
                for (const camData of status.cameras) {
                    const camera = this.cameraRepo.create({
                        name: camData.name,
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
                pi: {
                    id: pi.id,
                    name: pi.name,
                    hardwareId: pi.hardwareId,
                    status: pi.status,
                    lastSeen: pi.lastSeen,
                },
                cameras: {
                    total: newCameras.length,
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
            pi.status = 'offline';
            await this.piRepo.save(pi);

            throw new BadRequestException(
                `Không thể kết nối tới Pi '${pi.name}' tại ${targetIp}:8000. ` +
                `Lỗi: ${error.message}`
            );
        }
    }
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
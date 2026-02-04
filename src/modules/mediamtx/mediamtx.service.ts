import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class MediaMtxService {
    private readonly configPath = '/home/ubuntu/mediamtx.yml';
    private readonly apiUrl = 'http://localhost:9997';

    /**
     * Xóa cameras theo danh sách IDs
     */
    async removeCamerasByIds(streamIds: string[]): Promise<number> {
        try {
            const fileContent = await fs.readFile(this.configPath, 'utf8');
            const config = yaml.load(fileContent) as any;

            if (!config.paths) {
                return 0;
            }

            let removedCount = 0;

            // Xóa từng camera trong danh sách
            streamIds.forEach(streamId => {
                if (config.paths[streamId]) {
                    delete config.paths[streamId];
                    removedCount++;
                }
            });

            if (removedCount === 0) {
                console.log(`ℹ️ Không tìm thấy camera nào để xóa`);
                return 0;
            }

            // Ghi file
            const newYaml = yaml.dump(config, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });

            await fs.writeFile(this.configPath, newYaml, 'utf8');

            console.log(`✅ Đã xóa ${removedCount} streams khỏi MediaMTX config`);
            return removedCount;

        } catch (error) {
            console.error('❌ Lỗi khi xóa cameras:', error.message);
            throw new BadRequestException(
                `Failed to remove cameras: ${error.message}`
            );
        }
    }

    /**
     * Thêm nhiều cameras cùng lúc (batch add)
     */
    async addCamerasBatch(
        cameras: Array<{
            mainStreamId: string;
            subStreamId: string;
            piIp: string;
            piPort: number;
        }>
    ): Promise<number> {
        try {
            const fileContent = await fs.readFile(this.configPath, 'utf8');
            const config = yaml.load(fileContent) as any;

            if (!config.paths) {
                config.paths = {};
            }

            let addedCount = 0;

            // Thêm tất cả cameras
            for (const cam of cameras) {
                config.paths[cam.mainStreamId] = {
                    source: `rtsp://${cam.piIp}:${cam.piPort}/${cam.mainStreamId}`,
                    sourceOnDemand: true,
                    sourceProtocol: 'tcp',
                    sourceOnDemandCloseAfter: '5s'
                };

                config.paths[cam.subStreamId] = {
                    source: `rtsp://${cam.piIp}:${cam.piPort}/${cam.subStreamId}`,
                    sourceOnDemand: true,
                    sourceProtocol: 'tcp',
                    sourceOnDemandCloseAfter: '5s'
                };

                addedCount += 2; // main + sub
            }

            // Ghi file một lần
            const newYaml = yaml.dump(config, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });

            await fs.writeFile(this.configPath, newYaml, 'utf8');

            console.log(`✅ Đã thêm ${addedCount} streams vào MediaMTX config`);
            return addedCount;

        } catch (error) {
            console.error('❌ Lỗi khi thêm cameras:', error.message);
            throw new BadRequestException(
                `Failed to add cameras: ${error.message}`
            );
        }
    }

    /**
     * Reload MediaMTX config
     */
    async reload(): Promise<{ method: string; success: boolean; message?: string }> {
        try {
            // Thử reload qua API
            await axios.post(`${this.apiUrl}/v3/config/paths/reload`, {}, {
                timeout: 3000
            });
            console.log('✅ MediaMTX config reloaded via API');
            return { method: 'api', success: true };

        } catch (apiError) {
            console.warn('⚠️ API reload failed, trying systemd restart...');

            try {
                // Restart service qua systemd
                await execAsync('sudo systemctl restart mediamtx');
                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log('✅ MediaMTX service restarted');
                return { method: 'systemd', success: true };

            } catch (error) {
                console.error('❌ Restart failed:', error.message);
                return {
                    method: 'manual',
                    success: false,
                    message: 'Please restart MediaMTX manually: sudo systemctl restart mediamtx'
                };
            }
        }
    }

    /**
     * Kiểm tra MediaMTX có đang chạy không
     */
    async isRunning(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.apiUrl}/v3/config/get`, {
                timeout: 2000
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * Lấy danh sách paths hiện tại
     */
    async getPaths(): Promise<string[]> {
        try {
            const fileContent = await fs.readFile(this.configPath, 'utf8');
            const config = yaml.load(fileContent) as any;
            return config.paths ? Object.keys(config.paths) : [];
        } catch (error) {
            console.error('❌ Lỗi khi đọc config:', error.message);
            return [];
        }
    }
}
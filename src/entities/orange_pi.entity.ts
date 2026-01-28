import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { CameraEntity } from './camera.entity';

@Entity('orange_pi')
export class OrangePiEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, name: 'domain', nullable: true })
    domain: string;


    @Column({ type: 'varchar', length: 15, name: 'tailscale_ip' })
    tailscaleIp: string;

    @Column({ name: 'hardware_id', unique: true })
    hardwareId: string;

    @Column({
        type: 'enum',
        enum: ['online', 'offline'],
        default: 'offline'
    })
    status: 'online' | 'offline';

    @Column({ type: 'timestamp', name: 'last_seen', nullable: true })
    lastSeen: Date;

    @OneToMany(() => CameraEntity, (camera) => camera.pi, { cascade: true })
    cameras: CameraEntity[];

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date;
}
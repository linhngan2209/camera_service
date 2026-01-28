import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { OrangePiEntity } from './orange_pi.entity';

@Entity('camera')
export class CameraEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => OrangePiEntity, (pi) => pi.cameras, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pi_id' })
    pi: OrangePiEntity;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, name: 'path_main' })
    pathMain: string;

    @Column({ type: 'varchar', length: 255, name: 'path_sub', nullable: true })
    pathSub: string;

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt: Date;
}
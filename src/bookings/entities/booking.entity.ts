import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Showtime } from '../../showtimes/entities/showtime.entity';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Showtime, (showtime) => showtime.bookings)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;

  @Column({ name: 'showtime_id', type: 'int' })
  showtimeId: number;

  @Column()
  seatNumber: number;

  @Column()
  userId: string;

  @Column({ nullable: true, unique: true })
  idempotencyKey?: string;

  @CreateDateColumn({ name: 'booking_time' })
  bookingTime: Date;
}

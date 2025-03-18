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

  @Column({ name: 'seat_number' })
  seatNumber: number;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'booking_time' })
  bookingTime: Date;

  @ManyToOne(() => Showtime, (showtime) => showtime.bookings)
  @JoinColumn({ name: 'showtime_id' })
  showtime: Showtime;
}

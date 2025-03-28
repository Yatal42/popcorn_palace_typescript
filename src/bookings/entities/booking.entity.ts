import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Showtime } from '../../showtimes/entities/showtime.entity';

@Entity()
@Unique('UQ_showtime_seat', ['showtimeId', 'seatNumber'])
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

  @CreateDateColumn({ name: 'booking_time' })
  bookingTime: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Movie } from '../../movies/entities/movie.entity';
import { Theater } from '../../theaters/entities/theater.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity()
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Movie, (movie) => movie.showtimes)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'movie_id' })
  movieId: number;

  @Column()
  theater: string;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'end_time' })
  endTime: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @OneToMany(() => Booking, (booking) => booking.showtime)
  bookings: Booking[];
}

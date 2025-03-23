import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Movie } from '../../movies/entities/movie.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Theater } from '../../theaters/entities/theater.entity';

@Entity()
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Movie, (movie) => movie.showtimes)
  @JoinColumn({ name: 'movie_id' })
  movie: Movie;

  @Column({ name: 'movie_id' })
  movieId: number;

  @ManyToOne(() => Theater, (theater) => theater.showtimes)
  @JoinColumn({ name: 'theater_id' })
  theater: Theater;

  @Index()
  @Column({ name: 'theater_id' })
  theaterId: number;

  @Index()
  @Column({ name: 'start_time' })
  startTime: Date;

  @Index()
  @Column({ name: 'end_time' })
  endTime: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @OneToMany(() => Booking, (booking) => booking.showtime)
  bookings: Booking[];
}

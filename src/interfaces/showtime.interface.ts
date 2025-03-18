import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';
import { Booking } from '../bookings/entities/booking.entity';

export interface IShowtime {
  id: number;
  movie: Movie;
  theater: Theater;
  start_time: Date;
  end_time: Date;
  price: number;
  bookings: Booking[];
}

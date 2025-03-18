import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { Showtime } from './entities/showtime.entity';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectRepository(Showtime)
    private showtimesRepository: Repository<Showtime>,
    private moviesService: MoviesService,
  ) {}

  async create(createShowtimeDto: CreateShowtimeDto) {
    const movie = await this.moviesService.findOne(createShowtimeDto.movieId);

    const startTime = new Date(createShowtimeDto.startTime);
    let endTime;

    if (createShowtimeDto.endTime) {
      endTime = new Date(createShowtimeDto.endTime);
    } else {
      endTime = new Date(startTime.getTime() + movie.duration * 60000); // Convert minutes to milliseconds
    }

    const overlappingShowtime = await this.showtimesRepository.findOne({
      where: {
        theater: createShowtimeDto.theater,
        startTime: startTime,
        endTime: endTime,
      },
    });

    if (overlappingShowtime) {
      throw new BadRequestException(
        `There is already a showtime scheduled in theater ${createShowtimeDto.theater} at this time`,
      );
    }

    const showtime = this.showtimesRepository.create({
      movie,
      movieId: movie.id,
      theater: createShowtimeDto.theater,
      startTime,
      endTime,
      price: createShowtimeDto.price,
    });

    return this.showtimesRepository.save(showtime);
  }

  findAll() {
    return this.showtimesRepository.find({
      relations: ['movie', 'bookings'],
    });
  }

  async findOne(id: number) {
    const showtime = await this.showtimesRepository.findOne({
      where: { id },
      relations: ['movie', 'bookings'],
    });

    if (!showtime) {
      throw new NotFoundException(`Showtime with ID "${id}" not found`);
    }

    return showtime;
  }

  async update(id: number, updateShowtimeDto: UpdateShowtimeDto) {
    const showtime = await this.findOne(id);

    if (updateShowtimeDto.movieId) {
      const movie = await this.moviesService.findOne(updateShowtimeDto.movieId);
      showtime.movie = movie;
      showtime.movieId = movie.id;
    }

    const updates = {
      ...(updateShowtimeDto.theater && { theater: updateShowtimeDto.theater }),
      ...(updateShowtimeDto.price && { price: updateShowtimeDto.price }),
      ...(updateShowtimeDto.startTime && {
        startTime: new Date(updateShowtimeDto.startTime),
      }),
      ...(updateShowtimeDto.endTime && {
        endTime: new Date(updateShowtimeDto.endTime),
      }),
    };

    Object.assign(showtime, updates);

    return this.showtimesRepository.save(showtime);
  }

  async remove(id: number) {
    const showtime = await this.findOne(id);
    return this.showtimesRepository.remove(showtime);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  FindManyOptions,
} from 'typeorm';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';
import { Showtime } from './entities/showtime.entity';
import { MoviesService } from '../movies/movies.service';
import { TheatersService } from '../theaters/theaters.service';
import { Movie } from '../movies/entities/movie.entity';
import { Theater } from '../theaters/entities/theater.entity';

@Injectable()
export class ShowtimesService {
  constructor(
    @InjectRepository(Showtime)
    private showtimesRepository: Repository<Showtime>,
    private moviesService: MoviesService,
    private theatersService: TheatersService,
  ) {}

  async create(createShowtimeDto: CreateShowtimeDto) {
    return this.showtimesRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const movie = await transactionalEntityManager.findOne(Movie, {
          where: { id: createShowtimeDto.movieId },
        });

        if (!movie) {
          throw new NotFoundException(
            `Movie with ID ${createShowtimeDto.movieId} not found`,
          );
        }

        const theater = await transactionalEntityManager.findOne(Theater, {
          where: { id: createShowtimeDto.theaterId },
          lock: { mode: 'pessimistic_write' }, // Lock the theater record
        });

        if (!theater) {
          throw new NotFoundException(
            `Theater with ID ${createShowtimeDto.theaterId} not found`,
          );
        }

        const startTime = new Date(createShowtimeDto.startTime);
        let endTime;

        if (createShowtimeDto.endTime) {
          endTime = new Date(createShowtimeDto.endTime);
        } else {
          const durationInMs = movie.durationInMinutes * 60 * 1000;
          endTime = new Date(startTime.getTime() + durationInMs);
        }

        // This query will be consistent due to the theater lock
        const overlappingShowtime = await transactionalEntityManager.findOne(
          Showtime,
          {
            where: [
              {
                theaterId: createShowtimeDto.theaterId,
                startTime: LessThanOrEqual(endTime),
                endTime: MoreThanOrEqual(startTime),
              },
            ],
          },
        );

        if (overlappingShowtime) {
          throw new BadRequestException(
            `There is already a showtime scheduled in theater ${theater.name} at this time`,
          );
        }

        const showtime = new Showtime();
        showtime.movie = movie;
        showtime.movieId = movie.id;
        showtime.theater = theater;
        showtime.theaterId = theater.id;
        showtime.startTime = startTime;
        showtime.endTime = endTime;
        showtime.price = createShowtimeDto.price;

        return transactionalEntityManager.save(showtime);
      },
    );
  }

  findAll() {
    const findOptions: FindManyOptions<Showtime> = {
      relations: ['movie', 'theater', 'bookings'],
    };

    return this.showtimesRepository.find(findOptions);
  }

  async findOne(id: number) {
    const showtime = await this.showtimesRepository.findOne({
      where: { id },
      relations: ['movie', 'theater', 'bookings'],
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

    if (updateShowtimeDto.theaterId) {
      const theater = await this.theatersService.findOne(
        updateShowtimeDto.theaterId,
      );
      showtime.theater = theater;
      showtime.theaterId = theater.id;
    }

    const updates = {
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
    try {
      const result = await this.showtimesRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Showtime with ID ${id} not found`);
      }

      return { message: 'Showtime deleted successfully' };
    } catch (error) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot delete showtime that has associated bookings',
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error occurred while deleting showtime',
      );
    }
  }
}

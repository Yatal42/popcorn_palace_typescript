import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { AppLoggerService } from '../common/services/logger.service';

@Injectable()
export class MoviesService {
  private readonly logger = new AppLoggerService(MoviesService.name);

  constructor(
    @InjectRepository(Movie)
    private moviesRepository: Repository<Movie>,
  ) {}

  create(createMovieDto: CreateMovieDto) {
    try {
      const movie = this.moviesRepository.create(createMovieDto);
      return this.moviesRepository.save(movie);
    } catch (error) {
      this.logger.logDatabaseError(error, 'create', 'Movie');
      throw new InternalServerErrorException(
        'Failed to create movie. Please try again later.',
      );
    }
  }

  findAll(title?: string) {
    try {
      const findOptions: FindManyOptions<Movie> = {};

      if (title) {
        findOptions.where = {
          title: Like(`%${title}%`),
        };
      }

      return this.moviesRepository.find(findOptions);
    } catch (error) {
      this.logger.logDatabaseError(error, 'findAll', 'Movie');
      throw new InternalServerErrorException(
        'Failed to fetch movies. Please try again later.',
      );
    }
  }

  async findOne(id: number) {
    try {
      const movie = await this.moviesRepository.findOne({ where: { id } });
      if (!movie) {
        throw new NotFoundException(`Movie with ID ${id} not found`);
      }
      return movie;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'findOne', 'Movie');
      throw new InternalServerErrorException(
        'Failed to fetch movie. Please try again later.',
      );
    }
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    try {
      const movie = await this.findOne(id);
      this.moviesRepository.merge(movie, updateMovieDto);
      return this.moviesRepository.save(movie);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'update', 'Movie');
      throw new InternalServerErrorException(
        'Failed to update movie. Please try again later.',
      );
    }
  }

  async remove(id: number) {
    try {
      const result = await this.moviesRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Movie with ID ${id} not found`);
      }

      return { message: 'Movie deleted successfully' };
    } catch (error) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot delete movie that has associated showtimes',
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'remove', 'Movie');
      throw new InternalServerErrorException(
        'Failed to remove movie. Please try again later.',
      );
    }
  }

  async updateByTitle(movieTitle: string, updateMovieDto: UpdateMovieDto) {
    try {
      const movie = await this.moviesRepository.findOne({
        where: { title: movieTitle },
      });

      if (!movie) {
        throw new NotFoundException(
          `Movie with title "${movieTitle}" not found`,
        );
      }

      Object.assign(movie, updateMovieDto);
      return this.moviesRepository.save(movie);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'updateByTitle', 'Movie');
      throw new InternalServerErrorException(
        'Failed to update movie. Please try again later.',
      );
    }
  }

  async removeByTitle(movieTitle: string) {
    try {
      const movie = await this.moviesRepository.findOne({
        where: { title: movieTitle },
      });

      if (!movie) {
        throw new NotFoundException(
          `Movie with title "${movieTitle}" not found`,
        );
      }

      return this.moviesRepository.remove(movie);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'removeByTitle', 'Movie');
      throw new InternalServerErrorException(
        'Failed to remove movie. Please try again later.',
      );
    }
  }
}

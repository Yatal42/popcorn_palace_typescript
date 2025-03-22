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
        `Error occurred while creating movie: ${error.message}`,
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
        `Error occurred while fetching movies: ${error.message}`,
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
        `Error occurred while fetching movie: ${error.message}`,
      );
    }
  }

  async update(id: number, updateMovieDto: CreateMovieDto) {
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
        `Error occurred while updating movie: ${error.message}`,
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
        'Error occurred while deleting movie',
      );
    }
  }

  async updateByTitle(movieTitle: string, updateMovieDto: CreateMovieDto) {
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
        `Error occurred while updating movie by title: ${error.message}`,
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
        `Error occurred while removing movie by title: ${error.message}`,
      );
    }
  }
}

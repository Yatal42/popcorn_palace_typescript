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

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private moviesRepository: Repository<Movie>,
  ) {}

  create(createMovieDto: CreateMovieDto) {
    const movie = this.moviesRepository.create(createMovieDto);
    return this.moviesRepository.save(movie);
  }

  findAll(title?: string) {
    const findOptions: FindManyOptions<Movie> = {};

    if (title) {
      findOptions.where = {
        title: Like(`%${title}%`),
      };
    }

    return this.moviesRepository.find(findOptions);
  }

  async findOne(id: number) {
    const movie = await this.moviesRepository.findOne({ where: { id } });
    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }
    return movie;
  }

  async update(id: number, updateMovieDto: CreateMovieDto) {
    const movie = await this.findOne(id);
    this.moviesRepository.merge(movie, updateMovieDto);
    return this.moviesRepository.save(movie);
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

      throw new InternalServerErrorException(
        'Error occurred while deleting movie',
      );
    }
  }

  async updateByTitle(movieTitle: string, updateMovieDto: CreateMovieDto) {
    const movie = await this.moviesRepository.findOne({
      where: { title: movieTitle },
    });

    if (!movie) {
      throw new NotFoundException(`Movie with title "${movieTitle}" not found`);
    }

    Object.assign(movie, updateMovieDto);
    return this.moviesRepository.save(movie);
  }

  async removeByTitle(movieTitle: string) {
    const movie = await this.moviesRepository.findOne({
      where: { title: movieTitle },
    });

    if (!movie) {
      throw new NotFoundException(`Movie with title "${movieTitle}" not found`);
    }

    return this.moviesRepository.remove(movie);
  }
}

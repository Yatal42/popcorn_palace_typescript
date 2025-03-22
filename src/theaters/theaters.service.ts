import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Theater } from './entities/theater.entity';
import { CreateTheaterDto } from './dto/create-theater.dto';
import { AppLoggerService } from '../common/services/logger.service';

@Injectable()
export class TheatersService {
  private readonly logger = new AppLoggerService(TheatersService.name);

  constructor(
    @InjectRepository(Theater)
    private theatersRepository: Repository<Theater>,
  ) {}

  create(createTheaterDto: CreateTheaterDto) {
    try {
      const theater = this.theatersRepository.create(createTheaterDto);
      return this.theatersRepository.save(theater);
    } catch (error) {
      this.logger.logDatabaseError(error, 'create', 'Theater');
      throw new InternalServerErrorException(
        `Error occurred while creating theater: ${error.message}`,
      );
    }
  }

  findAll(name?: string) {
    try {
      const findOptions: FindManyOptions<Theater> = {};

      if (name) {
        findOptions.where = {
          name: Like(`%${name}%`),
        };
      }

      return this.theatersRepository.find(findOptions);
    } catch (error) {
      this.logger.logDatabaseError(error, 'findAll', 'Theater');
      throw new InternalServerErrorException(
        `Error occurred while fetching theaters: ${error.message}`,
      );
    }
  }

  async findOne(id: number) {
    try {
      const theater = await this.theatersRepository.findOne({ where: { id } });
      if (!theater) {
        throw new NotFoundException(`Theater with ID ${id} not found`);
      }
      return theater;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'findOne', 'Theater');
      throw new InternalServerErrorException(
        `Error occurred while fetching theater: ${error.message}`,
      );
    }
  }

  async update(id: number, updateTheaterDto: CreateTheaterDto) {
    try {
      const theater = await this.findOne(id);
      this.theatersRepository.merge(theater, updateTheaterDto);
      return this.theatersRepository.save(theater);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'update', 'Theater');
      throw new InternalServerErrorException(
        `Error occurred while updating theater: ${error.message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      const result = await this.theatersRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Theater with ID ${id} not found`);
      }

      return { message: 'Theater deleted successfully' };
    } catch (error) {
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot delete theater that has associated showtimes',
        );
      }
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'remove', 'Theater');
      throw new InternalServerErrorException(
        'Error occurred while deleting theater',
      );
    }
  }
}

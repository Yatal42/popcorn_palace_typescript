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

  async create(createTheaterDto: CreateTheaterDto) {
    try {
      const theater = this.theatersRepository.create(createTheaterDto);
      const result = await this.theatersRepository.save(theater);
      this.logger.log(
        `Theater created successfully: ${result.name} (ID: ${result.id})`,
      );
      return result;
    } catch (error) {
      this.logger.logDatabaseError(error, 'create', 'Theater');
      throw new InternalServerErrorException(
        'Failed to create theater. Please try again later.',
      );
    }
  }

  async findAll(name?: string) {
    try {
      const findOptions: FindManyOptions<Theater> = {};

      if (name) {
        findOptions.where = {
          name: Like(`%${name}%`),
        };
      }

      const theaters = await this.theatersRepository.find(findOptions);

      if (name && theaters.length === 0) {
        throw new NotFoundException(`No theaters found matching name: ${name}`);
      }

      return theaters;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'findAll', 'Theater');
      throw new InternalServerErrorException(
        'Failed to fetch theaters. Please try again later.',
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
        'Failed to fetch theater. Please try again later.',
      );
    }
  }

  async update(id: number, updateTheaterDto: CreateTheaterDto) {
    try {
      const theater = await this.findOne(id);
      this.theatersRepository.merge(theater, updateTheaterDto);
      const result = await this.theatersRepository.save(theater);
      this.logger.log(
        `Theater updated successfully: ${result.name} (ID: ${result.id})`,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'update', 'Theater');
      throw new InternalServerErrorException(
        'Failed to update theater. Please try again later.',
      );
    }
  }

  async remove(id: number) {
    try {
      const result = await this.theatersRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Theater with ID ${id} not found`);
      }

      this.logger.log(`Theater deleted successfully: ID ${id}`);
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
        'Failed to delete theater. Please try again later.',
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Theater } from './entities/theater.entity';
import { CreateTheaterDto } from './dto/create-theater.dto';

@Injectable()
export class TheatersService {
  constructor(
    @InjectRepository(Theater)
    private theatersRepository: Repository<Theater>,
  ) {}

  create(createTheaterDto: CreateTheaterDto) {
    const theater = this.theatersRepository.create(createTheaterDto);
    return this.theatersRepository.save(theater);
  }

  findAll(name?: string) {
    const findOptions: FindManyOptions<Theater> = {};

    if (name) {
      findOptions.where = {
        name: Like(`%${name}%`),
      };
    }

    return this.theatersRepository.find(findOptions);
  }

  async findOne(id: number) {
    const theater = await this.theatersRepository.findOne({ where: { id } });
    if (!theater) {
      throw new NotFoundException(`Theater with ID ${id} not found`);
    }
    return theater;
  }

  async update(id: number, updateTheaterDto: CreateTheaterDto) {
    const theater = await this.findOne(id);
    this.theatersRepository.merge(theater, updateTheaterDto);
    return this.theatersRepository.save(theater);
  }

  async remove(id: number) {
    await this.findOne(id);
    const theaterWithShowtimes = await this.theatersRepository.findOne({
      where: { id },
      relations: ['showtimes'],
    });

    if (theaterWithShowtimes.showtimes.length > 0) {
      throw new BadRequestException(
        'Cannot delete theater that has associated showtimes',
      );
    }

    const result = await this.theatersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Theater with ID ${id} not found`);
    }
  }
}

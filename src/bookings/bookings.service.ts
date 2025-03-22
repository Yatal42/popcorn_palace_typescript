import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { Showtime } from '../showtimes/entities/showtime.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private showtimesService: ShowtimesService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    try {
      if (createBookingDto.idempotencyKey) {
        const existingBookingWithKey = await this.bookingsRepository.findOne({
          where: { idempotencyKey: createBookingDto.idempotencyKey },
          relations: ['showtime'],
        });

        if (existingBookingWithKey) {
          return existingBookingWithKey;
        }
      }

      return this.bookingsRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const showtime = await transactionalEntityManager
            .createQueryBuilder(Showtime, 'showtime')
            .innerJoinAndSelect('showtime.theater', 'theater')
            .where('showtime.id = :id', { id: createBookingDto.showtimeId })
            .setLock('pessimistic_write')
            .getOne();

          if (!showtime) {
            throw new NotFoundException(
              `Showtime with ID "${createBookingDto.showtimeId}" not found`,
            );
          }

          const now = new Date();
          if (new Date(showtime.startTime) < now) {
            throw new BadRequestException(
              'Cannot book for a showtime that has already started',
            );
          }

          const existingBooking = await transactionalEntityManager.findOne(
            Booking,
            {
              where: {
                showtime: { id: createBookingDto.showtimeId },
                seatNumber: createBookingDto.seatNumber,
              },
            },
          );

          if (existingBooking) {
            throw new BadRequestException('Seat is already booked');
          }

          if (createBookingDto.seatNumber > showtime.theater.capacity) {
            throw new BadRequestException(
              `Seat number ${createBookingDto.seatNumber} exceeds theater capacity of ${showtime.theater.capacity}`,
            );
          }

          const existingBookingsCount = await transactionalEntityManager.count(
            Booking,
            {
              where: { showtime: { id: createBookingDto.showtimeId } },
            },
          );

          if (existingBookingsCount >= showtime.theater.capacity) {
            throw new BadRequestException(
              `Cannot book - theater capacity of ${showtime.theater.capacity} has been reached`,
            );
          }

          const booking = new Booking();
          booking.showtime = showtime;
          booking.showtimeId = showtime.id;
          booking.seatNumber = createBookingDto.seatNumber;
          booking.userId = createBookingDto.userId;
          if (createBookingDto.idempotencyKey) {
            booking.idempotencyKey = createBookingDto.idempotencyKey;
          }

          return transactionalEntityManager.save(booking);
        },
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('Booking error:', error.message, error.stack);

      if (error.code) {
        console.error(
          `SQL Error Code: ${error.code}, Detail: ${error.detail || 'No detail'}`,
        );
      }

      throw new InternalServerErrorException(
        `Error occurred while processing booking: ${error.message}`,
      );
    }
  }

  async findAll(userId?: string) {
    const findOptions: FindManyOptions<Booking> = {
      relations: ['showtime'],
    };

    if (userId) {
      findOptions.where = { userId };
    }

    return this.bookingsRepository.find(findOptions);
  }

  async findOne(id: string) {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['showtime'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    const booking = await this.findOne(id);
    Object.assign(booking, updateBookingDto);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: string) {
    try {
      const result = await this.bookingsRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Booking with ID "${id}" not found`);
      }

      return { message: 'Booking deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error occurred while deleting booking',
      );
    }
  }
}

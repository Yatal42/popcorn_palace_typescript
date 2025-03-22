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
import { AppLoggerService } from '../common/services/logger.service';

@Injectable()
export class BookingsService {
  private readonly logger = new AppLoggerService(BookingsService.name);

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

      this.logger.logDatabaseError(error, 'create', 'Booking');

      throw new InternalServerErrorException(
        `Error occurred while processing booking: ${error.message}`,
      );
    }
  }

  async findAll(userId?: string) {
    try {
      const findOptions: FindManyOptions<Booking> = {
        relations: ['showtime'],
      };

      if (userId) {
        findOptions.where = { userId };
      }

      return this.bookingsRepository.find(findOptions);
    } catch (error) {
      this.logger.logDatabaseError(error, 'findAll', 'Booking');
      throw new InternalServerErrorException(
        `Error occurred while fetching bookings: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      const booking = await this.bookingsRepository.findOne({
        where: { id },
        relations: ['showtime'],
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID "${id}" not found`);
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'findOne', 'Booking');
      throw new InternalServerErrorException(
        `Error occurred while fetching booking: ${error.message}`,
      );
    }
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    try {
      const booking = await this.findOne(id);
      Object.assign(booking, updateBookingDto);
      return this.bookingsRepository.save(booking);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'update', 'Booking');
      throw new InternalServerErrorException(
        `Error occurred while updating booking: ${error.message}`,
      );
    }
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

      this.logger.logDatabaseError(error, 'remove', 'Booking');

      throw new InternalServerErrorException(
        'Error occurred while deleting booking',
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ShowtimesService } from '../showtimes/showtimes.service';
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
      const showtime = await this.showtimesService.findOne(
        createBookingDto.showtimeId,
      );

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

      if (createBookingDto.seatNumber > showtime.theater.capacity) {
        throw new BadRequestException(
          `Seat number ${createBookingDto.seatNumber} exceeds theater capacity of ${showtime.theater.capacity}`,
        );
      }

      const existingBookingsCount = await this.bookingsRepository.count({
        where: { showtimeId: createBookingDto.showtimeId },
      });

      if (existingBookingsCount >= showtime.theater.capacity) {
        throw new BadRequestException(
          `Cannot book - theater capacity of ${showtime.theater.capacity} has been reached`,
        );
      }

      const booking = new Booking();
      booking.showtimeId = createBookingDto.showtimeId;
      booking.seatNumber = createBookingDto.seatNumber;
      booking.userId = createBookingDto.userId;

      const result = await this.bookingsRepository.save(booking);

      let logMessage = `Booking created successfully: Seat ${result.seatNumber} at ${showtime.startTime.toISOString()} by User ${result.userId} (ID: ${result.id})`;

      if (showtime.movie?.title) {
        logMessage = `Booking created successfully: Seat ${result.seatNumber} for Movie "${showtime.movie.title}" at ${showtime.startTime.toISOString()} by User ${result.userId} (ID: ${result.id})`;
      }

      this.logger.log(logMessage);
      return result;
    } catch (error) {
      if (
        error.code === '23505' &&
        (error.detail?.includes('showtimeId, seatNumber') ||
          error.detail?.includes('(showtime_id, "seatNumber")'))
      ) {
        this.logger.error(
          'Database error during create operation on Booking - Code: 23505, Detail: ' +
            error.detail,
        );
        throw new ConflictException('This seat is already booked');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'create', 'Booking');

      throw new InternalServerErrorException(
        'Failed to process booking. Please try again later.',
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

      const bookings = await this.bookingsRepository.find(findOptions);

      if (userId && bookings.length === 0) {
        throw new NotFoundException(`No bookings found for user ID: ${userId}`);
      }

      return bookings;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'findAll', 'Booking');
      throw new InternalServerErrorException(
        'Failed to fetch bookings. Please try again later.',
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
        'Failed to fetch booking. Please try again later.',
      );
    }
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    try {
      const booking = await this.findOne(id);

      Object.assign(booking, updateBookingDto);
      const result = await this.bookingsRepository.save(booking);

      this.logger.log(
        `Booking updated successfully: ID ${result.id}, User ${result.userId}, Seat ${result.seatNumber}`,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logDatabaseError(error, 'update', 'Booking');
      throw new InternalServerErrorException(
        'Failed to update booking. Please try again later.',
      );
    }
  }

  async remove(id: string) {
    try {
      const result = await this.bookingsRepository.delete(id);

      if (result.affected === 0) {
        throw new NotFoundException(`Booking with ID "${id}" not found`);
      }

      this.logger.log(`Booking deleted successfully: ID ${id}`);
      return { message: 'Booking deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.logDatabaseError(error, 'remove', 'Booking');

      throw new InternalServerErrorException(
        'Failed to delete booking. Please try again later.',
      );
    }
  }
}

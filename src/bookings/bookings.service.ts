import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ShowtimesService } from '../showtimes/showtimes.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private showtimesService: ShowtimesService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const showtime = await this.showtimesService.findOne(
      createBookingDto.showtimeId,
    );

    const now = new Date();
    if (new Date(showtime.startTime) < now) {
      throw new BadRequestException(
        'Cannot book for a showtime that has already started',
      );
    }

    const existingBooking = await this.bookingsRepository.findOne({
      where: {
        showtime: { id: createBookingDto.showtimeId },
        seatNumber: createBookingDto.seatNumber,
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Seat is already booked');
    }

    if (createBookingDto.seatNumber > showtime.theater.capacity) {
      throw new BadRequestException(
        `seat number ${createBookingDto.seatNumber} exceeds theater capacity of ${showtime.theater.capacity}`,
      );
    }

    const existingBookingsCount = await this.bookingsRepository.count({
      where: { showtime: { id: createBookingDto.showtimeId } },
    });

    if (existingBookingsCount >= showtime.theater.capacity) {
      throw new BadRequestException(
        `Cannot book - theater capacity of ${showtime.theater.capacity} has been reached`,
      );
    }

    const booking = this.bookingsRepository.create({
      showtime,
      seatNumber: createBookingDto.seatNumber,
      userId: createBookingDto.userId,
    });

    return this.bookingsRepository.save(booking);
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
    const booking = await this.findOne(id);
    return this.bookingsRepository.remove(booking);
  }
}

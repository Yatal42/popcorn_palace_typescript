import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    // Check if showtime exists
    const showtime = await this.showtimesService.findOne(
      createBookingDto.showtimeId,
    );

    // Check if seat is already booked
    const existingBooking = await this.bookingsRepository.findOne({
      where: {
        showtime: { id: createBookingDto.showtimeId },
        seatNumber: createBookingDto.seatNumber,
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Seat is already booked');
    }

    const booking = this.bookingsRepository.create({
      showtime,
      seatNumber: createBookingDto.seatNumber,
      userId: createBookingDto.userId,
    });

    return this.bookingsRepository.save(booking);
  }

  findAll() {
    return this.bookingsRepository.find({
      relations: ['showtime'],
    });
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

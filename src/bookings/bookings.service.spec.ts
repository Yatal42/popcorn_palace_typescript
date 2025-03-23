import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { ShowtimesService } from '../showtimes/showtimes.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: any;
  let showtimesService: any;

  beforeEach(async () => {
    bookingRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    showtimesService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingRepository,
        },
        {
          provide: ShowtimesService,
          useValue: showtimesService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking for an available seat', async () => {
      const currentDate = new Date();
      const futureDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // tomorrow

      const mockShowtime = {
        id: 1,
        startTime: futureDate,
        theater: {
          id: 1,
          capacity: 100,
        },
      };

      showtimesService.findOne.mockResolvedValue(mockShowtime);

      // Mock repository methods
      bookingRepository.findOne.mockResolvedValue(null); // No existing booking with idempotency key
      bookingRepository.count.mockResolvedValue(10); // 10 existing bookings (less than capacity)

      const savedBooking = {
        id: 'uuid-1',
        showtimeId: 1,
        seatNumber: 5,
        userId: 'user1',
      };
      bookingRepository.save.mockResolvedValue(savedBooking);

      const createBookingDto: CreateBookingDto = {
        showtimeId: 1,
        seatNumber: 5,
        userId: 'user1',
      };

      const result = await service.create(createBookingDto);

      // Verify results
      expect(showtimesService.findOne).toHaveBeenCalledWith(1);
      expect(bookingRepository.count).toHaveBeenCalled();
      expect(bookingRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedBooking);
    });

    it('should throw BadRequestException if showtime has already started', async () => {
      const currentDate = new Date();
      const pastDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000); // yesterday

      // Mock a showtime that has already started
      const mockShowtime = {
        id: 1,
        startTime: pastDate,
        theater: {
          id: 1,
          capacity: 100,
        },
      };

      showtimesService.findOne.mockResolvedValue(mockShowtime);

      const createBookingDto: CreateBookingDto = {
        showtimeId: 1,
        seatNumber: 5,
        userId: 'user1',
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        'Cannot book for a showtime that has already started',
      );
    });

    it('should throw BadRequestException if seat number exceeds theater capacity', async () => {
      const currentDate = new Date();
      const futureDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // tomorrow

      // Mock showtime with limited capacity
      const mockShowtime = {
        id: 1,
        startTime: futureDate,
        theater: {
          id: 1,
          capacity: 50,
        },
      };

      showtimesService.findOne.mockResolvedValue(mockShowtime);

      const createBookingDto: CreateBookingDto = {
        showtimeId: 1,
        seatNumber: 51, // Exceeds capacity
        userId: 'user1',
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        'Seat number 51 exceeds theater capacity of 50',
      );
    });

    it('should throw ConflictException when seat is already booked (unique constraint)', async () => {
      const currentDate = new Date();
      const futureDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000); // tomorrow

      // Mock showtime
      const mockShowtime = {
        id: 1,
        startTime: futureDate,
        theater: {
          id: 1,
          capacity: 100,
        },
      };

      showtimesService.findOne.mockResolvedValue(mockShowtime);
      bookingRepository.count.mockResolvedValue(10);

      // Simulate a database constraint error
      const constraintError = {
        code: '23505',
        detail: 'Key (showtimeId, seatNumber)=(1, 5) already exists',
      };

      bookingRepository.save.mockRejectedValue(constraintError);

      const createBookingDto: CreateBookingDto = {
        showtimeId: 1,
        seatNumber: 5,
        userId: 'user1',
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        'This seat is already booked',
      );
    });
  });

  describe('findAll', () => {
    it('should return all bookings when no userId is provided', async () => {
      const bookings = [
        {
          id: 'b1',
          showtimeId: 1,
          seatNumber: 1,
          userId: 'user-1',
        },
        {
          id: 'b2',
          showtimeId: 1,
          seatNumber: 2,
          userId: 'user-2',
        },
      ];

      bookingRepository.find.mockResolvedValue(bookings);

      const result = await service.findAll();

      expect(result).toEqual(bookings);
    });

    it('should filter bookings by userId when provided', async () => {
      const userId = 'user-1';
      const bookings = [
        {
          id: 'b1',
          showtimeId: 1,
          seatNumber: 1,
          userId,
        },
      ];

      bookingRepository.find.mockResolvedValue(bookings);

      const result = await service.findAll(userId);

      expect(bookingRepository.find).toHaveBeenCalledWith({
        where: { userId },
        relations: ['showtime'],
      });
      expect(result).toEqual(bookings);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if booking does not exist', async () => {
      const bookingId = 'nonexistent-id';

      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(bookingId)).rejects.toThrow(
        new NotFoundException(`Booking with ID "${bookingId}" not found`),
      );
    });
  });

  describe('remove', () => {
    it('should delete a booking if it exists', async () => {
      const bookingId = 'test-id';
      const deleteResult = { affected: 1 };

      bookingRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(bookingId);

      expect(bookingRepository.delete).toHaveBeenCalledWith(bookingId);
      expect(result).toEqual({ message: 'Booking deleted successfully' });
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      const bookingId = 'nonexistent-id';
      const deleteResult = { affected: 0 };

      bookingRepository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove(bookingId)).rejects.toThrow(
        new NotFoundException(`Booking with ID "${bookingId}" not found`),
      );
    });
  });
});

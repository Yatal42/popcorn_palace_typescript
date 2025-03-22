import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
      manager: {
        transaction: jest.fn(),
      },
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
      const showtimeId = 1;
      const seatNumber = 5;
      const userId = 'user-1';

      const showtime = {
        id: showtimeId,
        theaterId: 1,
        theater: {
          id: 1,
          capacity: 100,
        },
        startTime: new Date(Date.now() + 3600000), // 1 hour in the future
      };

      const newBooking = {
        id: 'b1',
        showtime,
        showtimeId,
        seatNumber,
        userId,
      };

      bookingRepository.manager.transaction.mockImplementation(
        async (callback) => {
          const mockQueryBuilder = {
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(showtime),
          };

          const mockEntityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn().mockResolvedValue(null), // No existing booking
            count: jest.fn().mockResolvedValue(0), // No bookings for this seat
            save: jest.fn().mockResolvedValue(newBooking),
          };

          return await callback(mockEntityManager);
        },
      );

      const createBookingDto: CreateBookingDto = {
        showtimeId,
        seatNumber,
        userId,
      };

      const result = await service.create(createBookingDto);

      expect(result).toEqual(newBooking);
      expect(bookingRepository.manager.transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if showtime has already started', async () => {
      const showtimeId = 1;
      const seatNumber = 5;
      const userId = 'user-1';

      const startedShowtime = {
        id: showtimeId,
        theaterId: 1,
        theater: {
          id: 1,
          capacity: 100,
        },
        startTime: new Date(Date.now() - 1000), // 1 second ago
      };

      bookingRepository.manager.transaction.mockImplementation(
        async (callback) => {
          const mockQueryBuilder = {
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(startedShowtime),
          };

          const mockEntityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
          };

          return await callback(mockEntityManager);
        },
      );

      const createBookingDto: CreateBookingDto = {
        showtimeId,
        seatNumber,
        userId,
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        'Cannot book for a showtime that has already started',
      );
    });

    it('should throw BadRequestException if seat is already booked', async () => {
      const showtimeId = 1;
      const seatNumber = 5;
      const userId = 'user-1';

      const showtime = {
        id: showtimeId,
        theaterId: 1,
        theater: {
          id: 1,
          capacity: 100,
        },
        startTime: new Date(Date.now() + 3600000), // 1 hour in future
      };

      const existingBooking = {
        id: 'b1',
        showtimeId,
        seatNumber,
        userId: 'other-user',
      };

      bookingRepository.manager.transaction.mockImplementation(
        async (callback) => {
          const mockQueryBuilder = {
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(showtime),
          };

          const mockEntityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn().mockResolvedValue(existingBooking),
            count: jest.fn(),
            save: jest.fn(),
          };

          return await callback(mockEntityManager);
        },
      );

      const createBookingDto: CreateBookingDto = {
        showtimeId,
        seatNumber,
        userId,
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        'Seat is already booked',
      );
    });

    it('should throw BadRequestException if seat number exceeds theater capacity', async () => {
      const showtimeId = 1;
      const seatNumber = 150; // Exceeds capacity of 100
      const userId = 'user-1';

      const showtime = {
        id: showtimeId,
        theaterId: 1,
        theater: {
          id: 1,
          capacity: 100,
        },
        startTime: new Date(Date.now() + 3600000), // 1 hour in future
      };

      bookingRepository.manager.transaction.mockImplementation(
        async (callback) => {
          const mockQueryBuilder = {
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(showtime),
          };

          const mockEntityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn().mockResolvedValue(null), // No existing booking
            count: jest.fn().mockResolvedValue(0),
            save: jest.fn(),
          };

          return await callback(mockEntityManager);
        },
      );

      const createBookingDto: CreateBookingDto = {
        showtimeId,
        seatNumber,
        userId,
      };

      await expect(service.create(createBookingDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createBookingDto)).rejects.toThrow(
        `Seat number ${seatNumber} exceeds theater capacity of 100`,
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

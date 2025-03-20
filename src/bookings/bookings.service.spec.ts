import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { ShowtimesService } from '../showtimes/showtimes.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

const setupBasicMocks = (
  bookingRepository: MockRepository<Booking>,
  showtimesService: { findOne: jest.Mock },
  showtimeId: number,
  validSeat = true,
  showtimeStarted = false,
  theaterCapacity = 100,
) => {
  const showtime = {
    id: showtimeId,
    theaterId: 1,
    theater: {
      id: 1,
      capacity: theaterCapacity,
    },
    startTime: showtimeStarted
      ? new Date(Date.now() - 1000) // 1 second ago
      : new Date(Date.now() + 3600000), // 1 hour in the future
  };

  showtimesService.findOne.mockResolvedValue(showtime);

  if (!validSeat) {
    bookingRepository.findOne.mockResolvedValue({
      id: 'b1',
      showtimeId,
      seatNumber: 5, // The seat is already booked
      userId: 'user-1',
    });
  } else {
    bookingRepository.findOne.mockResolvedValue(null);
  }

  bookingRepository.count.mockResolvedValue(0); // Default to 0 existing bookings

  return { showtime };
};

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: MockRepository<Booking>;
  let showtimesService: { findOne: jest.Mock };

  beforeEach(async () => {
    showtimesService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: createMockRepository(),
        },
        {
          provide: ShowtimesService,
          useValue: showtimesService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepository = module.get<MockRepository<Booking>>(
      getRepositoryToken(Booking),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking for an available seat', async () => {
      const showtimeId = 1;
      const seatNumber = 5;
      const userId = 'user-1';

      const { showtime } = setupBasicMocks(
        bookingRepository,
        showtimesService,
        showtimeId,
      );

      const createBookingDto: CreateBookingDto = {
        showtimeId,
        seatNumber,
        userId,
      };

      const newBooking = {
        id: 'b1',
        showtime,
        showtimeId,
        seatNumber,
        userId,
      };

      bookingRepository.create.mockReturnValue(newBooking);
      bookingRepository.save.mockResolvedValue(newBooking);

      const result = await service.create(createBookingDto);

      expect(result).toEqual(newBooking);
    });

    it('should throw BadRequestException if showtime has already started', async () => {
      const showtimeId = 1;
      const seatNumber = 5;
      const userId = 'user-1';

      setupBasicMocks(
        bookingRepository,
        showtimesService,
        showtimeId,
        true,
        true, // Showtime has started
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

      setupBasicMocks(
        bookingRepository,
        showtimesService,
        showtimeId,
        false, // Seat is not available
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

      setupBasicMocks(
        bookingRepository,
        showtimesService,
        showtimeId,
        true, // Seat is available
        false, // Showtime hasn't started
        100, // Theater capacity
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
        `seat number ${seatNumber} exceeds theater capacity of 100`,
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
    it('should throw NotFoundException if booking does not exist', async () => {
      const bookingId = 'nonexistent-id';

      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(bookingId)).rejects.toThrow(
        new NotFoundException(`Booking with ID "${bookingId}" not found`),
      );
    });
  });
});

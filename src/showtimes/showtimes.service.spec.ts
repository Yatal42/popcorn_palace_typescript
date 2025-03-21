import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowtimesService } from './showtimes.service';
import { Showtime } from './entities/showtime.entity';
import { MoviesService } from '../movies/movies.service';
import { TheatersService } from '../theaters/theaters.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
});

const setupMocksForOverlapTest = (
  showtimeRepository: MockRepository<Showtime>,
  moviesService: { findOne: jest.Mock },
  theatersService: { findOne: jest.Mock },
  theaterId: number,
  hasOverlap = false,
) => {
  const movieId = 1;
  const movie = { id: movieId, title: 'Test Movie' };
  const theater = { id: theaterId, name: 'Test Theater' };
  const expectedEndTime = new Date('2023-07-10T20:00:00Z');

  moviesService.findOne.mockResolvedValue(movie);
  theatersService.findOne.mockResolvedValue(theater);

  if (hasOverlap) {
    showtimeRepository.findOne.mockResolvedValue({
      id: 2,
      movieId: 2,
      theaterId,
      startTime: new Date('2023-07-10T19:00:00Z'),
      endTime: new Date('2023-07-10T21:00:00Z'),
    });
  } else {
    showtimeRepository.findOne.mockResolvedValue(null);
  }

  showtimeRepository.create.mockReturnValue({
    movie,
    movieId,
    theater,
    theaterId,
    startTime: new Date('2023-07-10T18:00:00Z'),
    endTime: expectedEndTime,
    price: 15.99,
  });

  return { movieId, movie, theater, expectedEndTime };
};

describe('ShowtimesService', () => {
  let service: ShowtimesService;
  let showtimeRepository: MockRepository<Showtime>;
  let moviesService: { findOne: jest.Mock };
  let theatersService: { findOne: jest.Mock };

  beforeEach(async () => {
    moviesService = {
      findOne: jest.fn(),
    };

    theatersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowtimesService,
        {
          provide: getRepositoryToken(Showtime),
          useValue: createMockRepository(),
        },
        {
          provide: MoviesService,
          useValue: moviesService,
        },
        {
          provide: TheatersService,
          useValue: theatersService,
        },
      ],
    }).compile();

    service = module.get<ShowtimesService>(ShowtimesService);
    showtimeRepository = module.get<MockRepository<Showtime>>(
      getRepositoryToken(Showtime),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a showtime when there are no overlapping showtimes', async () => {
      const theaterId = 1;
      const { movieId, movie, theater, expectedEndTime } =
        setupMocksForOverlapTest(
          showtimeRepository,
          moviesService,
          theatersService,
          theaterId,
          false,
        );

      const createShowtimeDto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: '2023-07-10T18:00:00Z',
        endTime: '2023-07-10T20:00:00Z',
        price: 15.99,
      };

      showtimeRepository.save.mockResolvedValue({
        id: 1,
        ...createShowtimeDto,
        movie,
        theater,
        startTime: new Date(createShowtimeDto.startTime),
        endTime: expectedEndTime,
      });

      const result = await service.create(createShowtimeDto);

      expect(result).toHaveProperty('id');
      expect(result.movie).toEqual(movie);
      expect(result.theater).toEqual(theater);
    });

    it('should throw BadRequestException when there is an overlapping showtime', async () => {
      const theaterId = 1;
      setupMocksForOverlapTest(
        showtimeRepository,
        moviesService,
        theatersService,
        theaterId,
        true,
      );

      const createShowtimeDto: CreateShowtimeDto = {
        movieId: 1,
        theaterId,
        startTime: '2023-07-10T18:00:00Z',
        endTime: '2023-07-10T20:00:00Z',
        price: 15.99,
      };

      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        /already a showtime scheduled/,
      );
    });

    it('should calculate correct end time based on movie duration when endTime is not provided', async () => {
      const movieId = 1;
      const theaterId = 1;
      const movie = {
        id: movieId,
        title: 'Test Movie',
        durationInMinutes: 120,
      };
      const theater = { id: theaterId, name: 'Test Theater' };

      moviesService.findOne.mockResolvedValue(movie);
      theatersService.findOne.mockResolvedValue(theater);
      showtimeRepository.findOne.mockResolvedValue(null);

      const startTime = new Date('2023-07-10T18:00:00Z');
      const expectedEndTime = new Date(startTime);
      expectedEndTime.setMinutes(
        expectedEndTime.getMinutes() + movie.durationInMinutes,
      );

      showtimeRepository.create.mockReturnValue({
        movie,
        movieId,
        theater,
        theaterId,
        startTime,
        endTime: expectedEndTime,
        price: 15.99,
      });

      showtimeRepository.save.mockImplementation((entity) =>
        Promise.resolve({
          id: 1,
          ...entity,
        }),
      );

      const createShowtimeDto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: '2023-07-10T18:00:00Z',
        endTime: undefined,
        price: 15.99,
      };

      const result = await service.create(createShowtimeDto);

      expect(result.endTime).toEqual(expectedEndTime);
    });
  });

  describe('findAll', () => {
    it('should return all showtimes', async () => {
      const showtimes = [
        {
          id: 1,
          movieId: 1,
          theaterId: 1,
          startTime: new Date(),
          endTime: new Date(),
          price: 15.99,
        },
      ];

      showtimeRepository.find.mockResolvedValue(showtimes);

      const result = await service.findAll();

      expect(result).toEqual(showtimes);
    });
  });

  describe('findOne', () => {
    it('should return a showtime if it exists', async () => {
      const showtimeId = 1;
      const showtime = {
        id: showtimeId,
        movieId: 1,
        theaterId: 1,
        startTime: new Date(),
        endTime: new Date(),
        price: 15.99,
      };

      showtimeRepository.findOne.mockResolvedValue(showtime);

      const result = await service.findOne(showtimeId);

      expect(result).toEqual(showtime);
    });

    it('should throw NotFoundException if showtime does not exist', async () => {
      const showtimeId = 999;

      showtimeRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(showtimeId)).rejects.toThrow(
        new NotFoundException(`Showtime with ID "${showtimeId}" not found`),
      );
    });
  });

  describe('update', () => {
    it('should update a showtime and verify it exists', async () => {
      const showtimeId = 1;
      const showtime = {
        id: showtimeId,
        movieId: 1,
        theaterId: 1,
        startTime: new Date(),
        endTime: new Date(),
        price: 15.99,
      };

      const updateShowtimeDto: UpdateShowtimeDto = {
        price: 19.99,
      };

      showtimeRepository.findOne.mockResolvedValue(showtime);
      showtimeRepository.merge.mockImplementation((target, source) => {
        Object.assign(target, source);
        return target;
      });
      showtimeRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(showtimeId, updateShowtimeDto);

      expect(showtimeRepository.findOne).toHaveBeenCalledWith({
        where: { id: showtimeId },
        relations: ['movie', 'theater', 'bookings'],
      });
      expect(result.price).toBe(19.99);
    });
  });

  describe('remove', () => {
    it('should delete a showtime if it exists', async () => {
      const showtimeId = 1;
      const deleteResult = { affected: 1 };

      showtimeRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(showtimeId);

      expect(showtimeRepository.delete).toHaveBeenCalledWith(showtimeId);
      expect(result).toEqual({ message: 'Showtime deleted successfully' });
    });

    it('should throw BadRequestException if showtime has associated bookings', async () => {
      const showtimeId = 1;
      const error = { code: '23503' };

      showtimeRepository.delete.mockRejectedValue(error);

      await expect(service.remove(showtimeId)).rejects.toThrow(
        new BadRequestException(
          'Cannot delete showtime that has associated bookings',
        ),
      );
    });

    it('should throw NotFoundException if showtime does not exist', async () => {
      const showtimeId = 999;
      const deleteResult = { affected: 0 };

      showtimeRepository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove(showtimeId)).rejects.toThrow(
        new NotFoundException(`Showtime with ID ${showtimeId} not found`),
      );
    });
  });
});

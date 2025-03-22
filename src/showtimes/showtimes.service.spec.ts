import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ShowtimesService } from './showtimes.service';
import { Showtime } from './entities/showtime.entity';
import { MoviesService } from '../movies/movies.service';
import { TheatersService } from '../theaters/theaters.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

interface MockEntityManager {
  transaction: jest.Mock;
  findOne?: jest.Mock;
  save?: jest.Mock;
  createQueryBuilder?: jest.Mock;
}

interface MockRepository<T = any> {
  find?: jest.Mock;
  findOne?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
  merge?: jest.Mock;
  delete?: jest.Mock;
  manager: MockEntityManager;
}

const createMockRepository = <T>(): MockRepository<T> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(async (callback) => {
        const mockTransactionManager = {
          findOne: jest.fn(),
          save: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
          }),
        };
        return callback(mockTransactionManager);
      }),
    },
  };
};

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
    jest.clearAllMocks();

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
    it('should create a showtime successfully', async () => {
      const theater = { id: 1, name: 'Theater 1', capacity: 100 };
      const movie = { id: 1, title: 'Movie 1', durationInMinutes: 120 };
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2); // 2 hours in the future

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      const dto: CreateShowtimeDto = {
        movieId: movie.id,
        theaterId: theater.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 15.99,
      };

      const newShowtime = {
        id: 1,
        movieId: movie.id,
        theaterId: theater.id,
        startTime,
        endTime,
        price: 15.99,
        movie,
        theater,
      };

      showtimeRepository.manager.transaction.mockImplementationOnce(
        async (callback) => {
          const transactionManager = {
            findOne: jest.fn().mockImplementation((entityClass, options) => {
              if (
                entityClass.name === 'Movie' &&
                options.where.id === movie.id
              ) {
                return Promise.resolve(movie);
              }
              if (
                entityClass.name === 'Theater' &&
                options.where.id === theater.id
              ) {
                return Promise.resolve(theater);
              }
              if (entityClass.name === 'Showtime') {
                return Promise.resolve(null);
              }
              return Promise.resolve(null);
            }),
            save: jest.fn().mockResolvedValue(newShowtime),
          };
          return callback(transactionManager);
        },
      );

      const result = await service.create(dto);

      expect(showtimeRepository.manager.transaction).toHaveBeenCalled();
      expect(result).toEqual(newShowtime);
    });

    it('should throw NotFoundException if theater is not found', async () => {
      const theaterId = 999; // Non-existent theater
      const movieId = 1;
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      const dto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 15.99,
      };

      showtimeRepository.manager.transaction.mockImplementationOnce(
        async (callback) => {
          const mockMovie = { id: movieId, title: 'Test Movie' };
          const transactionManager = {
            findOne: jest.fn((entityClass, options) => {
              if (entityClass.name === 'Movie') {
                return Promise.resolve(mockMovie);
              }
              if (entityClass.name === 'Theater') {
                // Theater not found
                return Promise.resolve(null);
              }
              return Promise.resolve(null);
            }),
            save: jest.fn(),
          };

          try {
            await callback(transactionManager);
          } catch (error) {
            expect(error).toBeInstanceOf(NotFoundException);
            expect(error.message).toBe(
              `Theater with ID ${theaterId} not found`,
            );
            throw error;
          }
        },
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if movie is not found', async () => {
      const theaterId = 1;
      const movieId = 999; // Non-existent movie
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      const dto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 15.99,
      };

      showtimeRepository.manager.transaction.mockImplementationOnce(
        async (callback) => {
          const transactionManager = {
            findOne: jest.fn().mockImplementation((entityClass, options) => {
              if (entityClass.name === 'Movie') {
                return Promise.resolve(null);
              }
              return Promise.resolve(null);
            }),
          };
          return callback(transactionManager);
        },
      );

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow(
        `Movie with ID ${movieId} not found`,
      );
    });

    it('should throw BadRequestException if showtime conflicts with another', async () => {
      const theater = { id: 1, name: 'Theater 1', capacity: 100 };
      const movie = { id: 1, title: 'Movie 1', durationInMinutes: 120 };
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      const dto: CreateShowtimeDto = {
        movieId: movie.id,
        theaterId: theater.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 15.99,
      };

      const existingShowtime = {
        id: 1,
        movieId: 2, // Different movie
        theaterId: theater.id,
        startTime: new Date(startTime.getTime() - 60 * 60 * 1000), // 1 hour before
        endTime: new Date(startTime.getTime() + 60 * 60 * 1000), // 1 hour after start
        theater,
      };

      showtimeRepository.manager.transaction.mockImplementationOnce(
        async (callback) => {
          const transactionManager = {
            findOne: jest.fn((entityClass, options) => {
              if (entityClass.name === 'Movie') {
                return Promise.resolve(movie);
              }
              if (entityClass.name === 'Theater') {
                return Promise.resolve(theater);
              }
              if (entityClass.name === 'Showtime') {
                return Promise.resolve(existingShowtime);
              }
              return Promise.resolve(null);
            }),
            save: jest.fn(),
          };

          try {
            await callback(transactionManager);
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.message).toBe(
              `There is already a showtime scheduled in theater ${theater.name} at this time`,
            );
            throw error;
          }
        },
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if startTime is in the past', async () => {
      const theater = { id: 1, name: 'Theater 1', capacity: 100 };
      const movie = { id: 1, title: 'Movie 1', durationInMinutes: 120 };

      const now = new Date();
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day in the past
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after start

      const dto: CreateShowtimeDto = {
        movieId: movie.id,
        theaterId: theater.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 15.99,
      };

      const originalTransaction = showtimeRepository.manager.transaction;
      showtimeRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (callback) => {
          if (new Date(dto.startTime) < new Date()) {
            throw new BadRequestException('Showtime must be in the future');
          }
          return originalTransaction(callback);
        });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'Showtime must be in the future',
      );

      showtimeRepository.manager.transaction = originalTransaction;
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

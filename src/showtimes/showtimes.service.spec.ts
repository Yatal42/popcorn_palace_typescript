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

interface MockRepository<T = any> {
  find?: jest.Mock;
  findOne?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
  merge?: jest.Mock;
  delete?: jest.Mock;
  createQueryBuilder?: jest.Mock;
}

const createMockRepository = <T>(): MockRepository<T> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
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
  let showtimesRepository: MockRepository<Showtime>;
  let moviesService: { findOne: jest.Mock };
  let theatersService: { findOne: jest.Mock };

  beforeEach(async () => {
    showtimesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

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
          useValue: showtimesRepository,
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a showtime when no conflicts exist', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // tomorrow

      const movieId = 1;
      const theaterId = 1;

      const mockMovie = {
        id: movieId,
        title: 'Test Movie',
        durationInMinutes: 120,
      };

      const mockTheater = {
        id: theaterId,
        name: 'Test Theater',
        capacity: 100,
      };

      moviesService.findOne.mockResolvedValue(mockMovie);
      theatersService.findOne.mockResolvedValue(mockTheater);

      showtimesRepository.findOne.mockResolvedValue(null);

      const expectedShowtime = {
        id: 1,
        movie: mockMovie,
        movieId,
        theater: mockTheater,
        theaterId,
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 120 * 60 * 1000),
        price: 10.5,
      };
      showtimesRepository.save.mockResolvedValue(expectedShowtime);

      const createShowtimeDto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: futureDate.toISOString(),
        price: 10.5,
        endTime: new Date(futureDate.getTime() + 120 * 60 * 1000).toISOString(),
      };

      const result = await service.create(createShowtimeDto);

      expect(moviesService.findOne).toHaveBeenCalledWith(movieId);
      expect(theatersService.findOne).toHaveBeenCalledWith(theaterId);
      expect(showtimesRepository.findOne).toHaveBeenCalled();
      expect(showtimesRepository.save).toHaveBeenCalled();
      expect(result).toEqual(expectedShowtime);
    });

    it('should throw BadRequestException when showtime overlaps with existing one', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // tomorrow

      const movieId = 1;
      const theaterId = 1;

      const mockMovie = {
        id: movieId,
        title: 'Test Movie',
        durationInMinutes: 120,
      };

      const mockTheater = {
        id: theaterId,
        name: 'Test Theater',
        capacity: 100,
      };

      moviesService.findOne.mockResolvedValue(mockMovie);
      theatersService.findOne.mockResolvedValue(mockTheater);

      const overlappingShowtime = {
        id: 2,
        movieId: 2,
        theaterId,
        startTime: new Date(futureDate.getTime() - 30 * 60 * 1000), // 30 minutes before
        endTime: new Date(futureDate.getTime() + 90 * 60 * 1000), // 90 minutes after
      };
      showtimesRepository.findOne.mockResolvedValue(overlappingShowtime);

      const createShowtimeDto: CreateShowtimeDto = {
        movieId,
        theaterId,
        startTime: futureDate.toISOString(),
        price: 10.5,
        endTime: new Date(futureDate.getTime() + 120 * 60 * 1000).toISOString(),
      };

      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(moviesService.findOne).toHaveBeenCalledWith(movieId);
      expect(theatersService.findOne).toHaveBeenCalledWith(theaterId);
      expect(showtimesRepository.findOne).toHaveBeenCalled();
      expect(showtimesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when movie does not exist', async () => {
      moviesService.findOne.mockImplementation(() => {
        throw new NotFoundException('Movie not found');
      });

      const createShowtimeDto: CreateShowtimeDto = {
        movieId: 999, // non-existent movie
        theaterId: 1,
        startTime: new Date().toISOString(),
        price: 10.5,
        endTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      };

      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(moviesService.findOne).toHaveBeenCalledWith(999);
      expect(theatersService.findOne).not.toHaveBeenCalled();
      expect(showtimesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when theater does not exist', async () => {
      moviesService.findOne.mockResolvedValue({
        id: 1,
        title: 'Test Movie',
        durationInMinutes: 120,
      });

      theatersService.findOne.mockImplementation(() => {
        throw new NotFoundException('Theater not found');
      });

      const createShowtimeDto: CreateShowtimeDto = {
        movieId: 1,
        theaterId: 999, // non-existent theater
        startTime: new Date().toISOString(),
        price: 10.5,
        endTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      };

      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(moviesService.findOne).toHaveBeenCalledWith(1);
      expect(theatersService.findOne).toHaveBeenCalledWith(999);
      expect(showtimesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when showtime is in the past', async () => {
      // Mock movie and theater
      moviesService.findOne.mockResolvedValue({
        id: 1,
        title: 'Test Movie',
        durationInMinutes: 120,
      });
      theatersService.findOne.mockResolvedValue({
        id: 1,
        name: 'Test Theater',
        capacity: 100,
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // yesterday

      const createShowtimeDto: CreateShowtimeDto = {
        movieId: 1,
        theaterId: 1,
        startTime: pastDate.toISOString(),
        price: 10.5,
        endTime: new Date(pastDate.getTime() + 120 * 60 * 1000).toISOString(),
      };

      await expect(service.create(createShowtimeDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(moviesService.findOne).toHaveBeenCalledWith(1);
      expect(theatersService.findOne).toHaveBeenCalledWith(1);
      expect(showtimesRepository.save).not.toHaveBeenCalled();
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

      showtimesRepository.find.mockResolvedValue(showtimes);

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

      showtimesRepository.findOne.mockResolvedValue(showtime);

      const result = await service.findOne(showtimeId);

      expect(result).toEqual(showtime);
    });

    it('should throw NotFoundException if showtime does not exist', async () => {
      const showtimeId = 999;

      showtimesRepository.findOne.mockResolvedValue(null);

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

      showtimesRepository.findOne.mockResolvedValue(showtime);
      showtimesRepository.merge.mockImplementation((target, source) => {
        Object.assign(target, source);
        return target;
      });
      showtimesRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(showtimeId, updateShowtimeDto);

      expect(showtimesRepository.findOne).toHaveBeenCalledWith({
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

      showtimesRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(showtimeId);

      expect(showtimesRepository.delete).toHaveBeenCalledWith(showtimeId);
      expect(result).toEqual({ message: 'Showtime deleted successfully' });
    });

    it('should throw BadRequestException if showtime has associated bookings', async () => {
      const showtimeId = 1;
      const error = { code: '23503' };

      showtimesRepository.delete.mockRejectedValue(error);

      await expect(service.remove(showtimeId)).rejects.toThrow(
        new BadRequestException(
          'Cannot delete showtime that has associated bookings',
        ),
      );
    });

    it('should throw NotFoundException if showtime does not exist', async () => {
      const showtimeId = 999;
      const deleteResult = { affected: 0 };

      showtimesRepository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove(showtimeId)).rejects.toThrow(
        new NotFoundException(`Showtime with ID ${showtimeId} not found`),
      );
    });
  });
});

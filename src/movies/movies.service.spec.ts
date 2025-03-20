import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoviesService } from './movies.service';
import { Movie } from './entities/movie.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
});

describe('MoviesService', () => {
  let service: MoviesService;
  let movieRepository: MockRepository<Movie>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        {
          provide: getRepositoryToken(Movie),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
    movieRepository = module.get<MockRepository<Movie>>(
      getRepositoryToken(Movie),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new movie', async () => {
      const createMovieDto = {
        title: 'Test Movie',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      const newMovie = { id: 1, ...createMovieDto };

      movieRepository.create.mockReturnValue(newMovie);
      movieRepository.save.mockResolvedValue(newMovie);

      const result = await service.create(createMovieDto);

      expect(movieRepository.create).toHaveBeenCalledWith(createMovieDto);
      expect(movieRepository.save).toHaveBeenCalledWith(newMovie);
      expect(result).toEqual(newMovie);
    });
  });

  describe('findAll', () => {
    it('should return all movies when no title is provided', async () => {
      const movies = [
        {
          id: 1,
          title: 'Test Movie 1',
          genre: 'Action',
          duration: 120,
          rating: 8.5,
          releaseYear: 2023,
        },
        {
          id: 2,
          title: 'Test Movie 2',
          genre: 'Comedy',
          duration: 90,
          rating: 7.5,
          releaseYear: 2022,
        },
      ];

      movieRepository.find.mockResolvedValue(movies);

      const result = await service.findAll();

      expect(movieRepository.find).toHaveBeenCalledWith();
      expect(result).toEqual(movies);
    });

    it('should filter movies by title', async () => {
      const title = 'Action';
      const movies = [
        {
          id: 1,
          title: 'Action Movie',
          genre: 'Action',
          duration: 120,
          rating: 8.5,
          releaseYear: 2023,
        },
      ];

      movieRepository.find.mockResolvedValue(movies);

      const result = await service.findAll(title);

      expect(movieRepository.find).toHaveBeenCalledWith({
        where: {
          title: expect.anything(),
        },
      });
      expect(result).toEqual(movies);
    });
  });

  describe('findOne', () => {
    it('should return a movie if it exists', async () => {
      const movieId = 1;
      const movie = {
        id: movieId,
        title: 'Test Movie',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      movieRepository.findOne.mockResolvedValue(movie);

      const result = await service.findOne(movieId);

      expect(movieRepository.findOne).toHaveBeenCalledWith({
        where: { id: movieId },
      });
      expect(result).toEqual(movie);
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      const movieId = 999;

      movieRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(movieId)).rejects.toThrow(
        new NotFoundException(`Movie with ID ${movieId} not found`),
      );
    });
  });

  describe('update', () => {
    it('should update a movie if it exists', async () => {
      const movieId = 1;
      const existingMovie = {
        id: movieId,
        title: 'Old Title',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      const updateMovieDto = {
        title: 'Updated Title',
        genre: 'Comedy',
        duration: 90,
        rating: 7.0,
        releaseYear: 2022,
      };

      movieRepository.findOne.mockResolvedValue(existingMovie);

      movieRepository.merge.mockImplementation((target, source) => {
        Object.assign(target, source);
        return target;
      });

      movieRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(movieId, updateMovieDto);

      expect(movieRepository.findOne).toHaveBeenCalledWith({
        where: { id: movieId },
      });
      expect(movieRepository.merge).toHaveBeenCalledWith(
        existingMovie,
        updateMovieDto,
      );

      // Verify the save was called with the right data
      expect(movieRepository.save).toHaveBeenCalled();
      const savedEntity = movieRepository.save.mock.calls[0][0];
      expect(savedEntity.id).toBe(movieId);
      expect(savedEntity.title).toBe('Updated Title');
      expect(savedEntity.genre).toBe('Comedy');
      expect(savedEntity.duration).toBe(90);
      expect(savedEntity.rating).toBe(7.0);
      expect(savedEntity.releaseYear).toBe(2022);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      const movieId = 999;
      const updateMovieDto = {
        title: 'Updated Title',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      movieRepository.findOne.mockResolvedValue(null);

      await expect(service.update(movieId, updateMovieDto)).rejects.toThrow(
        new NotFoundException(`Movie with ID ${movieId} not found`),
      );
    });
  });

  describe('remove', () => {
    it('should delete a movie if it exists and has no showtimes', async () => {
      const movieId = 1;
      const movie = {
        id: movieId,
        title: 'Test Movie',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
        showtimes: [],
      };

      movieRepository.findOne
        .mockResolvedValueOnce(movie)
        .mockResolvedValueOnce(movie);

      movieRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(movieId);

      expect(movieRepository.findOne).toHaveBeenCalledWith({
        where: { id: movieId },
      });
      expect(movieRepository.findOne).toHaveBeenCalledWith({
        where: { id: movieId },
        relations: ['showtimes'],
      });
      expect(movieRepository.delete).toHaveBeenCalledWith(movieId);
    });

    it('should throw BadRequestException if movie has associated showtimes', async () => {
      const movieId = 1;
      const movie = {
        id: movieId,
        title: 'Test Movie',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      const movieWithShowtimes = {
        ...movie,
        showtimes: [{ id: 1 }],
      };

      movieRepository.findOne
        .mockResolvedValueOnce(movie)
        .mockResolvedValueOnce(movieWithShowtimes);

      await expect(service.remove(movieId)).rejects.toThrow(
        new BadRequestException(
          'Cannot delete movie that has associated showtimes',
        ),
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      const movieId = 999;

      movieRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(movieId)).rejects.toThrow(
        new NotFoundException(`Movie with ID ${movieId} not found`),
      );
    });
  });
});

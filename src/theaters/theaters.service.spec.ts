import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatersService } from './theaters.service';
import { Theater } from './entities/theater.entity';
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

describe('TheatersService', () => {
  let service: TheatersService;
  let theaterRepository: MockRepository<Theater>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TheatersService,
        {
          provide: getRepositoryToken(Theater),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<TheatersService>(TheatersService);
    theaterRepository = module.get<MockRepository<Theater>>(
      getRepositoryToken(Theater),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new theater', async () => {
      const createTheaterDto = {
        name: 'Test Theater',
        capacity: 100,
      };

      const newTheater = { id: 1, ...createTheaterDto };

      theaterRepository.create.mockReturnValue(newTheater);
      theaterRepository.save.mockResolvedValue(newTheater);

      const result = await service.create(createTheaterDto);

      expect(theaterRepository.create).toHaveBeenCalledWith(createTheaterDto);
      expect(theaterRepository.save).toHaveBeenCalledWith(newTheater);
      expect(result).toEqual(newTheater);
    });
  });

  describe('findAll', () => {
    it('should return all theaters when no name is provided', async () => {
      const theaters = [
        {
          id: 1,
          name: 'Theater 1',
          capacity: 100,
        },
        {
          id: 2,
          name: 'Theater 2',
          capacity: 150,
        },
      ];

      theaterRepository.find.mockResolvedValue(theaters);

      const result = await service.findAll();

      expect(theaterRepository.find).toHaveBeenCalledWith({});
      expect(result).toEqual(theaters);
    });

    it('should filter theaters by name', async () => {
      const name = 'IMAX';
      const theaters = [
        {
          id: 1,
          name: 'IMAX Theater',
          capacity: 300,
        },
      ];

      theaterRepository.find.mockResolvedValue(theaters);

      const result = await service.findAll(name);

      expect(theaterRepository.find).toHaveBeenCalledWith({
        where: {
          name: expect.anything(),
        },
      });
      expect(result).toEqual(theaters);
    });
  });

  describe('findOne', () => {
    it('should return a theater if it exists', async () => {
      const theaterId = 1;
      const theater = {
        id: theaterId,
        name: 'Test Theater',
        capacity: 100,
      };

      theaterRepository.findOne.mockResolvedValue(theater);

      const result = await service.findOne(theaterId);

      expect(theaterRepository.findOne).toHaveBeenCalledWith({
        where: { id: theaterId },
      });
      expect(result).toEqual(theater);
    });

    it('should throw NotFoundException if theater does not exist', async () => {
      const theaterId = 999;

      theaterRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(theaterId)).rejects.toThrow(
        new NotFoundException(`Theater with ID ${theaterId} not found`),
      );
    });
  });

  describe('update', () => {
    it('should update a theater if it exists', async () => {
      const theaterId = 1;
      const existingTheater = {
        id: theaterId,
        name: 'Old Theater Name',
        capacity: 100,
      };

      const updateTheaterDto = {
        name: 'Updated Theater Name',
        capacity: 150,
      };

      theaterRepository.findOne.mockResolvedValue(existingTheater);

      theaterRepository.merge.mockImplementation((target, source) => {
        Object.assign(target, source);
        return target;
      });

      theaterRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(theaterId, updateTheaterDto);

      expect(theaterRepository.findOne).toHaveBeenCalledWith({
        where: { id: theaterId },
      });
      expect(theaterRepository.merge).toHaveBeenCalledWith(
        existingTheater,
        updateTheaterDto,
      );

      expect(theaterRepository.save).toHaveBeenCalled();
      const savedEntity = theaterRepository.save.mock.calls[0][0];
      expect(savedEntity.id).toBe(theaterId);
      expect(savedEntity.name).toBe('Updated Theater Name');
      expect(savedEntity.capacity).toBe(150);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if theater does not exist', async () => {
      const theaterId = 999;
      const updateTheaterDto = {
        name: 'Updated Theater Name',
        capacity: 200,
      };

      theaterRepository.findOne.mockResolvedValue(null);

      await expect(service.update(theaterId, updateTheaterDto)).rejects.toThrow(
        new NotFoundException(`Theater with ID ${theaterId} not found`),
      );
    });
  });

  describe('remove', () => {
    it('should delete a theater if it exists and has no showtimes', async () => {
      const theaterId = 1;
      const deleteResult = { affected: 1 };

      theaterRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.remove(theaterId);

      expect(theaterRepository.delete).toHaveBeenCalledWith(theaterId);
      expect(result).toEqual({ message: 'Theater deleted successfully' });
    });

    it('should throw BadRequestException if theater has associated showtimes', async () => {
      const theaterId = 1;
      const error = { code: '23503' };

      theaterRepository.delete.mockRejectedValue(error);

      await expect(service.remove(theaterId)).rejects.toThrow(
        new BadRequestException(
          'Cannot delete theater that has associated showtimes',
        ),
      );
    });

    it('should throw NotFoundException if theater does not exist', async () => {
      const theaterId = 999;
      const deleteResult = { affected: 0 };

      theaterRepository.delete.mockResolvedValue(deleteResult);

      await expect(service.remove(theaterId)).rejects.toThrow(
        new NotFoundException(`Theater with ID ${theaterId} not found`),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('Popcorn Palace API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: () => ({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'postgres',
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true,
            dropSchema: true,
            logging: false,
          }),
          inject: [ConfigService],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Movies', () => {
    it('should create a movie', () => {
      return request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'The Matrix',
          genre: 'Sci-Fi',
          duration: 136,
          rating: 8.7,
          releaseYear: 1999,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('The Matrix');
          expect(res.body.genre).toBe('Sci-Fi');
          expect(res.body.duration).toBe(136);
          expect(res.body.rating).toBe(8.7);
          expect(res.body.releaseYear).toBe(1999);
        });
    });

    it('should get all movies', async () => {
      await request(app.getHttpServer()).post('/movies').send({
        title: 'Inception',
        genre: 'Sci-Fi',
        duration: 148,
        rating: 8.8,
        releaseYear: 2010,
      });

      return request(app.getHttpServer())
        .get('/movies')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('title');
        });
    });

    it('should get a movie by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'The Shawshank Redemption',
          genre: 'Drama',
          duration: 142,
          rating: 9.3,
          releaseYear: 1994,
        });

      const movieId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/movies/${movieId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', movieId);
          expect(res.body.title).toBe('The Shawshank Redemption');
        });
    });

    it('should return 404 for non-existent movie', () => {
      return request(app.getHttpServer()).get('/movies/9999').expect(404);
    });
  });

  describe('Theaters', () => {
    it('should create a theater', () => {
      return request(app.getHttpServer())
        .post('/theaters')
        .send({
          name: 'IMAX Theater',
          capacity: 200,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('IMAX Theater');
          expect(res.body.capacity).toBe(200);
        });
    });

    it('should get all theaters', async () => {
      await request(app.getHttpServer()).post('/theaters').send({
        name: 'Dolby Cinema',
        capacity: 150,
      });

      return request(app.getHttpServer())
        .get('/theaters')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('name');
        });
    });

    it('should get a theater by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/theaters')
        .send({
          name: 'VIP Theater',
          capacity: 50,
        });

      const theaterId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/theaters/${theaterId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', theaterId);
          expect(res.body.name).toBe('VIP Theater');
        });
    });

    it('should return 404 for non-existent theater', () => {
      return request(app.getHttpServer()).get('/theaters/9999').expect(404);
    });
  });

  describe('Showtimes', () => {
    let movieId: number;
    let theaterId: number;

    beforeAll(async () => {
      const movieResponse = await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'The Dark Knight',
          genre: 'Action',
          duration: 152,
          rating: 9.0,
          releaseYear: 2008,
        });
      movieId = movieResponse.body.id;

      const theaterResponse = await request(app.getHttpServer())
        .post('/theaters')
        .send({
          name: 'Premium Theater',
          capacity: 100,
        });
      theaterId = theaterResponse.body.id;
    });

    it('should create a showtime', () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);

      return request(app.getHttpServer())
        .post('/showtimes')
        .send({
          movieId,
          theater: 'Premium Theater',
          startTime: startTime.toISOString(),
          price: 15.99,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.movie.id).toBe(movieId);
          expect(res.body.theater).toBe('Premium Theater');
          expect(res.body.price).toBe(15.99);
        });
    });

    it('should get all showtimes', async () => {
      return request(app.getHttpServer())
        .get('/showtimes')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('movie');
          expect(res.body[0]).toHaveProperty('theater');
        });
    });

    it('should return 404 for non-existent showtime', () => {
      return request(app.getHttpServer()).get('/showtimes/9999').expect(404);
    });
  });

  describe('Bookings', () => {
    let showtimeId: number;

    beforeAll(async () => {
      const movieResponse = await request(app.getHttpServer())
        .post('/movies')
        .send({
          title: 'Avengers: Endgame',
          genre: 'Action',
          duration: 181,
          rating: 8.4,
          releaseYear: 2019,
        });

      const theaterResponse = await request(app.getHttpServer())
        .post('/theaters')
        .send({
          name: 'Screening Room',
          capacity: 80,
        });

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);

      const showtimeResponse = await request(app.getHttpServer())
        .post('/showtimes')
        .send({
          movieId: movieResponse.body.id,
          theater: 'Screening Room',
          startTime: startTime.toISOString(),
          price: 14.99,
        });

      showtimeId = showtimeResponse.body.id;
    });

    it('should create a booking', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          showtimeId,
          seatNumber: 12,
          userId: 'user123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.showtime.id).toBe(showtimeId);
          expect(res.body.seatNumber).toBe(12);
          expect(res.body.userId).toBe('user123');
        });
    });

    it('should test duplicate seat booking prevention', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .send({
          showtimeId,
          seatNumber: 15,
          userId: 'user456',
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          showtimeId,
          seatNumber: 15,
          userId: 'user789',
        })
        .expect(400);
    });

    it('should return 404 for booking with non-existent showtime', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          showtimeId: 9999,
          seatNumber: 1,
          userId: 'user123',
        })
        .expect(404);
    });
  });
});

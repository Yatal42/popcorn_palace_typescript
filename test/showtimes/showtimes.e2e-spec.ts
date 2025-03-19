import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  createTestMovie,
  createTestShowtime,
  createTestTheater,
  setupCommonTestData,
  cleanupTest,
} from '../utils/test-setup';

describe('Showtimes API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Showtime Operations', () => {
    let createdShowtimeId: number;

    it('should create a showtime', async () => {
      const movie = await createTestMovie(app);
      const theater = await createTestTheater(app);

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);

      const showtimeData = {
        movieId: movie.id,
        theaterId: theater.id,
        startTime: startTime.toISOString(),
        price: 15.99,
      };

      const response = await request(app.getHttpServer())
        .post('/showtimes')
        .send(showtimeData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.movie.id).toBe(movie.id);
      expect(response.body.theaterId).toBe(theater.id);
      expect(parseFloat(response.body.price)).toBe(15.99);

      createdShowtimeId = response.body.id;
    });

    it('should get all showtimes', async () => {
      const response = await request(app.getHttpServer()).get('/showtimes');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.find((showtime) => showtime.id === createdShowtimeId),
      ).toBeTruthy();
    });

    it('should get a showtime by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/showtimes/${createdShowtimeId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdShowtimeId);
      expect(parseFloat(response.body.price)).toBe(15.99);
    });

    it('should return 404 for a non-existent showtime', async () => {
      const response = await request(app.getHttpServer()).get(
        '/showtimes/9999',
      );

      expect(response.status).toBe(404);
    });

    it('should update a showtime', async () => {
      const updateData = {
        price: 19.99,
      };

      const response = await request(app.getHttpServer())
        .patch(`/showtimes/${createdShowtimeId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.price)).toBe(19.99);
    });

    it('should delete a showtime', async () => {
      const movie = await createTestMovie(app);
      const theater = await createTestTheater(app);
      const showtimeToDelete = await createTestShowtime(
        app,
        movie.id,
        theater.id,
      );

      const response = await request(app.getHttpServer()).delete(
        `/showtimes/${showtimeToDelete.id}`,
      );

      expect(response.status).toBe(200);

      const getResponse = await request(app.getHttpServer()).get(
        `/showtimes/${showtimeToDelete.id}`,
      );

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Showtime Validation', () => {
    let commonData;

    beforeEach(async () => {
      await cleanupTest(app);
      commonData = await setupCommonTestData(app);
    });

    // Test overlapping showtimes in the same theater
    it('should prevent overlapping showtimes in the same theater', async () => {
      const movie = await createTestMovie(app);
      const theater = await createTestTheater(app);

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 5); // 5 hours from now

      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2); // 2 hours after start time

      await createTestShowtime(app, movie.id, theater.id, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        price: 14.99,
      });

      const overlappingStart = new Date(startTime);
      overlappingStart.setMinutes(overlappingStart.getMinutes() + 30); // 30 minutes after the first showtime starts

      const overlappingShowtimeData = {
        movieId: movie.id,
        theaterId: theater.id, // Same theater
        startTime: overlappingStart.toISOString(),
        price: 15.99,
      };

      const response = await request(app.getHttpServer())
        .post('/showtimes')
        .send(overlappingShowtimeData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'already a showtime scheduled in theater',
      );
    });
  });
});

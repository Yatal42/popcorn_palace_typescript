import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  createTestMovie,
  createTestShowtime,
  createTestTheater,
} from '../utils/test-setup';

describe('Showtimes API (e2e)', () => {
  let app: INestApplication;
  let movieId: number;
  let createdShowtimeId: number;
  let createdMovieId: number;
  let createdTheaterId: number;

  beforeAll(async () => {
    app = await setupTestApp();

    const movie = await createTestMovie(app);
    createdMovieId = movie.id;
    movieId = movie.id;

    const theater = await createTestTheater(app);
    createdTheaterId = theater.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('should create a showtime', async () => {
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);

    const showtimeData = {
      movieId: movieId,
      theaterId: createdTheaterId,
      startTime: startTime.toISOString(),
      price: 15.99,
    };

    const response = await request(app.getHttpServer())
      .post('/showtimes')
      .send(showtimeData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.movie.id).toBe(movieId);
    expect(response.body.theaterId).toBe(createdTheaterId);
    expect(response.body.price).toBe(15.99);
    expect(new Date(response.body.startTime)).toStrictEqual(
      new Date(showtimeData.startTime),
    );

    const movieDurationInMs = 120 * 60 * 1000;
    const expectedEndTime = new Date(startTime.getTime() + movieDurationInMs);
    expect(new Date(response.body.endTime)).toStrictEqual(expectedEndTime);

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
    expect(response.body.movie.id).toBe(movieId);
    expect(response.body.theaterId).toBe(createdTheaterId);
  });

  it('should return 404 for non-existent showtime', async () => {
    const nonExistentId = 99999;

    const response = await request(app.getHttpServer()).get(
      `/showtimes/${nonExistentId}`,
    );

    expect(response.status).toBe(404);
  });

  it('should update a showtime', async () => {
    const updateData = {
      theaterId: createdTheaterId,
      price: 20.99,
    };

    const response = await request(app.getHttpServer())
      .patch(`/showtimes/${createdShowtimeId}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdShowtimeId);
    expect(response.body.theaterId).toBe(createdTheaterId);
    expect(response.body.price).toBe(updateData.price);
    expect(response.body.movie.id).toBe(movieId);
  });

  it('should prevent creating overlapping showtimes in the same theater', async () => {
    const tempTheater = await createTestTheater(app);
    const tempTheaterId = tempTheater.id;

    const tempShowtime = await createTestShowtime(app, movieId, tempTheaterId, {
      startTime: new Date().toISOString(),
    });

    // Try to create another showtime with the same theater and overlapping time
    const overlapData = {
      movieId,
      theaterId: tempTheaterId,
      startTime: new Date().toISOString(),
      price: 12.99,
    };

    const response = await request(app.getHttpServer())
      .post('/showtimes')
      .send(overlapData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already a showtime scheduled');
  });

  it('should delete a showtime', async () => {
    const tempTheater = await createTestTheater(app);
    const tempShowtime = await createTestShowtime(app, movieId, tempTheater.id);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/showtimes/${tempShowtime.id}`)
      .send();

    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app.getHttpServer()).get(
      `/showtimes/${tempShowtime.id}`,
    );

    expect(getResponse.status).toBe(404);
  });
});

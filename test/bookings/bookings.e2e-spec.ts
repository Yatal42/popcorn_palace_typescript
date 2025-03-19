import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  createTestMovie,
  createTestShowtime,
  createTestBooking,
  createTestTheater,
} from '../utils/test-setup';

describe('Bookings API (e2e)', () => {
  let app: INestApplication;
  let movieId: number;
  let showtimeId: number;
  let createdBookingId: string;
  let theaterId: number;

  beforeAll(async () => {
    app = await setupTestApp();

    const movie = await createTestMovie(app);
    movieId = movie.id;

    const theater = await createTestTheater(app);
    theaterId = theater.id;

    const showtime = await createTestShowtime(app, movieId, theaterId);
    showtimeId = showtime.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('should create a booking', async () => {
    const bookingData = {
      showtimeId: showtimeId,
      seatNumber: 12,
      userId: 'user123',
    };

    const response = await request(app.getHttpServer())
      .post('/bookings')
      .send(bookingData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.showtime.id).toBe(showtimeId);
    expect(response.body.seatNumber).toBe(bookingData.seatNumber);
    expect(response.body.userId).toBe(bookingData.userId);

    createdBookingId = response.body.id;
  });

  it('should get all bookings', async () => {
    const response = await request(app.getHttpServer()).get('/bookings');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(
      response.body.find((booking) => booking.id === createdBookingId),
    ).toBeTruthy();
  });

  it('should get a booking by id', async () => {
    const response = await request(app.getHttpServer()).get(
      `/bookings/${createdBookingId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdBookingId);
    expect(response.body.showtime.id).toBe(showtimeId);
    expect(response.body.seatNumber).toBe(12);
    expect(response.body.userId).toBe('user123');
  });

  it('should prevent duplicate seat booking', async () => {
    const duplicateBookingData = {
      showtimeId: showtimeId,
      seatNumber: 12, // Same seat as the existing booking
      userId: 'user456',
    };

    const response = await request(app.getHttpServer())
      .post('/bookings')
      .send(duplicateBookingData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already booked');
  });

  it('should return 404 for booking with non-existent showtime', async () => {
    const nonExistentShowtimeId = 99999;
    const bookingData = {
      showtimeId: nonExistentShowtimeId,
      seatNumber: 20,
      userId: 'user789',
    };

    const response = await request(app.getHttpServer())
      .post('/bookings')
      .send(bookingData);

    expect(response.status).toBe(404);
  });

  it('should delete a booking', async () => {
    const tempBooking = await createTestBooking(app, showtimeId, {
      seatNumber: 25,
      userId: 'userToDelete',
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/bookings/${tempBooking.id}`)
      .send();

    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app.getHttpServer()).get(
      `/bookings/${tempBooking.id}`,
    );

    expect(getResponse.status).toBe(404);
  });
});

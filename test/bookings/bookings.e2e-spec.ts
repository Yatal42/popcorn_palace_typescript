import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { createTestBooking, setupCommonTestData } from '../utils/test-setup';
import { clearTables } from '../setup';
import { Showtime } from '../../src/showtimes/entities/showtime.entity';
import { DataSource } from 'typeorm';

describe('Bookings Controller (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let commonData: any;
  let createdBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    commonData = await setupCommonTestData(app);
  });

  beforeEach(async () => {
    await clearTables();
    commonData = await setupCommonTestData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Booking Operations', () => {
    it('should create a booking', async () => {
      const bookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: 1,
        userId: 'test-user-123',
      };

      const response = await request(server)
        .post('/bookings')
        .send(bookingData)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body).toMatchObject({
        userId: bookingData.userId,
        seatNumber: bookingData.seatNumber,
        showtimeId: bookingData.showtimeId,
      });

      createdBookingId = response.body.id;
    });

    it('should get all bookings', async () => {
      const booking = await createTestBooking(app, commonData.showtime.id, {
        seatNumber: 1,
        userId: 'test-user-123',
      });
      createdBookingId = booking.body.id;

      const response = await request(server).get('/bookings');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get a booking by id', async () => {
      const booking = await createTestBooking(app, commonData.showtime.id, {
        seatNumber: 1,
        userId: 'test-user-123',
      });
      createdBookingId = booking.body.id;

      const response = await request(server).get(
        `/bookings/${createdBookingId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdBookingId);
      expect(response.body.seatNumber).toBe(1);
    });

    it('should return 404 for a non-existent booking', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(server).get(
        `/bookings/${nonExistentUuid}`,
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('should delete a booking', async () => {
      const bookingToDelete = await createTestBooking(
        app,
        commonData.showtime.id,
        {
          seatNumber: 15,
          userId: 'delete-test-user',
        },
      );

      const response = await request(server).delete(
        `/bookings/${bookingToDelete.body.id}`,
      );

      expect(response.status).toBe(200);

      const getResponse = await request(server).get(
        `/bookings/${bookingToDelete.body.id}`,
      );

      expect(getResponse.status).toBeGreaterThanOrEqual(400);
      expect(getResponse.status).toBeLessThan(500);
    });
  });

  describe('Booking Validation', () => {
    it('should prevent duplicate seat bookings', async () => {
      const bookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: 5,
        userId: 'first-user',
      };

      await request(server).post('/bookings').send(bookingData).expect(200);

      // Try to book same seat
      const duplicateBookingData = {
        ...bookingData,
        userId: 'second-user',
      };

      const response = await request(server)
        .post('/bookings')
        .send(duplicateBookingData);

      expect(response.status).toBe(409);
      expect(response.body.message.toLowerCase()).toContain(
        'seat is already booked',
      );
    });

    it('should handle non-existent showtime', async () => {
      const invalidBookingData = {
        showtimeId: 9999, // Non-existent showtime ID
        seatNumber: 1,
        userId: 'test-user',
      };

      const response = await request(server)
        .post('/bookings')
        .send(invalidBookingData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate seat number against theater capacity', async () => {
      const capacity = commonData.theater.capacity;

      // Try to book a seat that exceeds capacity
      const invalidBookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: capacity + 1,
        userId: 'capacity-test-user',
      };

      const response = await request(server)
        .post('/bookings')
        .send(invalidBookingData);

      expect(response.status).toBeGreaterThanOrEqual(400);

      if (response.status < 500) {
        expect(response.body.message.toLowerCase()).toContain('seat number');
      }
    });

    it('should prevent bookings when theater is at full capacity', async () => {
      const smallTheater = await request(server)
        .post('/theaters')
        .send({
          name: 'Small Test Theater',
          capacity: 3, // Very small capacity for testing
        })
        .expect(200);

      const showtime = await request(server)
        .post('/showtimes')
        .send({
          movieId: commonData.movie.id,
          theaterId: smallTheater.body.id,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
          price: 10.99,
        })
        .expect(200);

      for (let seat = 1; seat <= 3; seat++) {
        await request(server)
          .post('/bookings')
          .send({
            showtimeId: showtime.body.id,
            seatNumber: seat,
            userId: `user-${seat}`,
          })
          .expect(200);
      }

      const response = await request(server).post('/bookings').send({
        showtimeId: showtime.body.id,
        seatNumber: 1,
        userId: 'extra-user',
      });

      expect(response.status).toBe(400);
      expect(response.body.message.toLowerCase()).toContain('capacity');
    });

    it('should prevent bookings for past showtimes', async () => {
      const connection = app.get(DataSource);
      const showtimeRepository = connection.getRepository(Showtime);

      // Create start time (yesterday)
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Create end time (2 hours after start time)
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const pastShowtime = await showtimeRepository.save({
        movieId: commonData.movie.id,
        theaterId: commonData.theater.id,
        startTime: startTime,
        endTime: endTime,
        price: 10.99,
      });

      const response = await request(server).post('/bookings').send({
        showtimeId: pastShowtime.id,
        seatNumber: 1,
        userId: 'past-user',
      });

      expect(response.status).toBe(400);
      expect(response.body.message.toLowerCase()).toContain('already started');
    });
  });
});

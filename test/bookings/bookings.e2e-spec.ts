import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  setupTestApp,
  createTestBooking,
  setupCommonTestData,
  cleanupTest,
} from '../utils/test-setup';

describe('Bookings API (e2e)', () => {
  let app: INestApplication;
  let commonData;

  beforeAll(async () => {
    app = await setupTestApp();
    commonData = await setupCommonTestData(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Booking Operations', () => {
    let createdBookingId: string; // UUID string

    it('should create a booking', async () => {
      const bookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: 10,
        userId: 'test-user',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      // The response may have a showtime object instead of just showtimeId
      if (response.body.showtimeId) {
        expect(response.body.showtimeId).toBe(commonData.showtime.id);
      } else if (response.body.showtime) {
        expect(response.body.showtime.id).toBe(commonData.showtime.id);
      }
      expect(response.body.seatNumber).toBe(10);
      expect(response.body.userId).toBe('test-user');

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
      expect(response.body.seatNumber).toBe(10);
    });

    it('should return 404 for a non-existent booking', async () => {
      // Use a properly formatted UUID that doesn't exist
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer()).get(
        `/bookings/${nonExistentUuid}`,
      );

      expect(response.status).toBe(404);
    });

    it('should delete a booking', async () => {
      // Create a booking specifically for deletion
      const bookingToDelete = await createTestBooking(
        app,
        commonData.showtime.id,
        {
          seatNumber: 15,
          userId: 'delete-test-user',
        },
      );

      const response = await request(app.getHttpServer()).delete(
        `/bookings/${bookingToDelete.id}`,
      );

      expect(response.status).toBe(200);

      const getResponse = await request(app.getHttpServer()).get(
        `/bookings/${bookingToDelete.id}`,
      );

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Booking Validation', () => {
    beforeEach(async () => {
      await cleanupTest(app);
      commonData = await setupCommonTestData(app);
    });

    it('should prevent duplicate seat bookings', async () => {
      // Create a booking
      await createTestBooking(app, commonData.showtime.id, {
        seatNumber: 5,
        userId: 'user1',
      });

      // Try to book the same seat
      const duplicateBookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: 5,
        userId: 'user2',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(duplicateBookingData);

      expect(response.status).toBe(400);
      expect(response.body.message.toLowerCase()).toContain('already booked');
    });

    it('should handle non-existent showtime', async () => {
      const invalidBookingData = {
        showtimeId: 9999, // Non-existent showtime ID
        seatNumber: 1,
        userId: 'test-user',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(invalidBookingData);

      expect(response.status).toBe(404);
    });

    it('should validate seat number against theater capacity', async () => {
      // Get theater capacity from common test data
      const capacity = commonData.theater.capacity;

      // Try to book a seat that exceeds capacity
      const invalidBookingData = {
        showtimeId: commonData.showtime.id,
        seatNumber: capacity + 1, // One more than capacity
        userId: 'capacity-test-user',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(invalidBookingData);

      expect(response.status).toBe(400);
      expect(response.body.message.toLowerCase()).toContain('seat number');
    });
  });
});

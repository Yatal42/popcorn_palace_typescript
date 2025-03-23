import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp } from '../utils/test-setup';

describe('Theaters API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Theater Operations', () => {
    let createdTheaterId: number;

    it('should create a theater', async () => {
      const theaterData = {
        name: 'Test Theater Creation',
        capacity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/theaters')
        .send(theaterData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(theaterData.name);
      expect(response.body.capacity).toBe(theaterData.capacity);

      createdTheaterId = response.body.id;
    });

    it('should get all theaters', async () => {
      const response = await request(app.getHttpServer()).get('/theaters');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a theater by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/theaters/${createdTheaterId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdTheaterId);
    });

    it('should update a theater', async () => {
      const updateData = {
        name: 'Updated Theater Name',
        capacity: 200,
      };

      const response = await request(app.getHttpServer())
        .patch(`/theaters/${createdTheaterId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.capacity).toBe(updateData.capacity);
    });

    it('should delete a theater', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/theaters/${createdTheaterId}`,
      );

      expect(response.status).toBe(200);

      const getResponse = await request(app.getHttpServer()).get(
        `/theaters/${createdTheaterId}`,
      );

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Theater Validation', () => {
    it('should accept a theater with valid capacity', async () => {
      const validTheaterData = {
        name: 'Valid Capacity Theater',
        capacity: 100,
      };

      const response = await request(app.getHttpServer())
        .post('/theaters')
        .send(validTheaterData);

      expect(response.status).toBe(200);
      expect(response.body.capacity).toBe(validTheaterData.capacity);
    });

    it('should reject a theater with negative capacity', async () => {
      const invalidTheaterData = {
        name: 'Invalid Theater',
        capacity: -10,
      };

      const response = await request(app.getHttpServer())
        .post('/theaters')
        .send(invalidTheaterData);

      expect(response.status).toBe(400);
      expect(response.body.message[0]).toContain('capacity');
    });
  });
});

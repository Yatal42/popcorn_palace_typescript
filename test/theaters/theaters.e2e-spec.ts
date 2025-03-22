import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp, createTestTheater } from '../utils/test-setup';

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
        name: 'New Test Theater',
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
      expect(
        response.body.find((theater) => theater.id === createdTheaterId),
      ).toBeTruthy();
    });

    it('should get a theater by id', async () => {
      const theater = await createTestTheater(app, {
        name: 'Get By ID Theater',
        capacity: 110,
      });

      const response = await request(app.getHttpServer()).get(
        `/theaters/${theater.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(theater.id);
      expect(response.body.name).toBe('Get By ID Theater');
    });

    it('should return 404 for a non-existent theater', async () => {
      const response = await request(app.getHttpServer()).get('/theaters/9999');

      expect(response.status).toBe(404);
    });
  });
});

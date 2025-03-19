import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp, createTestTheater } from '../utils/test-setup';

describe('Theaters API (e2e)', () => {
  let app: INestApplication;
  let createdTheaterId: number;

  beforeAll(async () => {
    app = await setupTestApp();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('should create a theater', async () => {
    const theaterData = {
      name: 'Premium Theater',
      capacity: 100,
    };

    const response = await request(app.getHttpServer())
      .post('/theaters')
      .send(theaterData);

    expect(response.status).toBe(201);
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
    const response = await request(app.getHttpServer()).get(
      `/theaters/${createdTheaterId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdTheaterId);
    expect(response.body.name).toBe('Premium Theater');
    expect(response.body.capacity).toBe(100);
  });

  it('should return 404 for non-existent theater', async () => {
    const nonExistentId = 99999;

    const response = await request(app.getHttpServer()).get(
      `/theaters/${nonExistentId}`,
    );

    expect(response.status).toBe(404);
  });

  it('should update a theater', async () => {
    const updateData = {
      name: 'Updated Theater Name',
      capacity: 150,
    };

    const response = await request(app.getHttpServer())
      .patch(`/theaters/${createdTheaterId}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdTheaterId);
    expect(response.body.name).toBe(updateData.name);
    expect(response.body.capacity).toBe(updateData.capacity);
  });

  it('should delete a theater', async () => {
    const theaterToDelete = await createTestTheater(app, {
      name: 'Theater To Delete',
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/theaters/${theaterToDelete.id}`)
      .send();

    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app.getHttpServer()).get(
      `/theaters/${theaterToDelete.id}`,
    );

    expect(getResponse.status).toBe(404);
  });
});

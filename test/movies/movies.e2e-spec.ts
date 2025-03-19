import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { setupTestApp } from '../utils/test-setup';

describe('Movies API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Basic Movie Operations', () => {
    let createdMovieId: number;

    it('should create a movie', async () => {
      const movieData = {
        title: 'Test Movie Creation',
        genre: 'Action',
        duration: 120,
        rating: 8.5,
        releaseYear: 2023,
      };

      const response = await request(app.getHttpServer())
        .post('/movies')
        .send(movieData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(movieData.title);
      expect(response.body.genre).toBe(movieData.genre);
      expect(response.body.duration).toBe(movieData.duration);
      expect(response.body.rating).toBe(movieData.rating);
      expect(response.body.releaseYear).toBe(movieData.releaseYear);

      createdMovieId = response.body.id;
    });

    it('should get all movies', async () => {
      const response = await request(app.getHttpServer()).get('/movies');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.find((movie) => movie.id === createdMovieId),
      ).toBeTruthy();
    });

    it('should get a movie by id', async () => {
      const response = await request(app.getHttpServer()).get(
        `/movies/${createdMovieId}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdMovieId);
      expect(response.body.title).toBe('Test Movie Creation');
    });

    it('should return 404 for a non-existent movie', async () => {
      const response = await request(app.getHttpServer()).get('/movies/9999');

      expect(response.status).toBe(404);
    });

    it('should update a movie', async () => {
      const updateData = {
        title: 'Updated Movie Title',
        rating: 9.0,
      };

      const response = await request(app.getHttpServer())
        .patch(`/movies/${createdMovieId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.rating).toBe(updateData.rating);
      expect(response.body.genre).toBe('Action'); // Unchanged field
    });

    it('should delete a movie', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/movies/${createdMovieId}`,
      );

      expect(response.status).toBe(200);

      const getResponse = await request(app.getHttpServer()).get(
        `/movies/${createdMovieId}`,
      );

      expect(getResponse.status).toBe(404);
    });
  });
});

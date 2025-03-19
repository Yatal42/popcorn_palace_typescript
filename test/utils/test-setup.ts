import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { waitForDatabase, clearTables, testDataSource } from '../setup';

let appInstance: INestApplication | null = null;

// Creates and initializes a test application.
export async function setupTestApp(): Promise<INestApplication> {
  if (appInstance) {
    // If we're reusing the app, clear the database.
    await clearTables();
    return appInstance;
  }

  await waitForDatabase();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      // Use our testDataSource instead of creating a new connection
      TypeOrmModule.forRoot({
        ...testDataSource.options,
        synchronize: true,
        dropSchema: false,
        logging: false,
      }),
      AppModule,
    ],
  }).compile();

  appInstance = moduleFixture.createNestApplication();
  await appInstance.init();

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return appInstance;
}

export async function createTestMovie(
  app: INestApplication,
  movieData: any = {},
) {
  const defaultMovie = {
    title: `Test Movie ${Date.now()}`,
    genre: 'Action',
    duration: 120,
    rating: 8.5,
    releaseYear: 2023,
    ...movieData,
  };

  const response = await request(app.getHttpServer())
    .post('/movies')
    .send(defaultMovie);

  return response.body;
}

export async function createTestTheater(
  app: INestApplication,
  theaterData: any = {},
) {
  const defaultTheater = {
    name: `Test Theater ${Date.now()}`,
    capacity: 100,
    ...theaterData,
  };

  const response = await request(app.getHttpServer())
    .post('/theaters')
    .send(defaultTheater);

  return response.body;
}

export async function createTestShowtime(
  app: INestApplication,
  movieId: number,
  theaterId: number,
  showtimeData: any = {},
) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 1);

  const defaultShowtime = {
    movieId,
    theaterId,
    startTime: startTime.toISOString(),
    price: 15.99,
    ...showtimeData,
  };

  const response = await request(app.getHttpServer())
    .post('/showtimes')
    .send(defaultShowtime);

  return response.body;
}

export async function createTestBooking(
  app: INestApplication,
  showtimeId: number,
  bookingData: any = {},
) {
  const defaultBooking = {
    showtimeId,
    seatNumber: Math.floor(Math.random() * 50) + 1, // Random seat
    userId: `user-${Date.now()}`,
    ...bookingData,
  };

  const response = await request(app.getHttpServer())
    .post('/bookings')
    .send(defaultBooking);

  return response.body;
}

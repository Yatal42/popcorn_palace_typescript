import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { waitForDatabase, clearTables, testDataSource } from '../setup';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

let appInstance: INestApplication | null = null;

export async function setupTestApp(): Promise<INestApplication> {
  if (appInstance) {
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
  appInstance.useGlobalFilters(new HttpExceptionFilter());

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
    durationInMinutes: 120,
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

// Function to generate a simple UUID-like string
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
    idempotencyKey: generateUUID(),
    ...bookingData,
  };

  try {
    const response = await request(app.getHttpServer())
      .post('/bookings')
      .send(defaultBooking);

    console.log(`Booking response status: ${response.status}`);

    if (response.status >= 400) {
      console.error(
        `Booking creation failed with ${response.status}:`,
        response.body,
      );
      console.error('Request data was:', defaultBooking);
      throw new Error(
        `Failed to create test booking with status ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }

    return response.body;
  } catch (error) {
    console.error('Error creating test booking:', error);
    throw error;
  }
}

export async function setupCommonTestData(app: INestApplication) {
  const movie = await createTestMovie(app);
  const theater = await createTestTheater(app);
  const showtime = await createTestShowtime(app, movie.id, theater.id);

  return { movie, theater, showtime };
}

export async function createMultipleBookings(
  app: INestApplication,
  showtimeId: number,
  count: number,
  baseData: any = {},
) {
  const bookingPromises = [];

  for (let i = 1; i <= count; i++) {
    const bookingData = {
      showtimeId,
      seatNumber: i,
      userId: `batch-user-${Date.now()}-${i}`,
      idempotencyKey: generateUUID(),
      ...baseData,
    };

    bookingPromises.push(
      request(app.getHttpServer()).post('/bookings').send(bookingData),
    );
  }

  const responses = await Promise.all(bookingPromises);
  return responses.map((response) => response.body);
}

export function setupRelatedTests(description, setupFn, testFns) {
  describe(description, () => {
    let setupData;

    beforeEach(async () => {
      setupData = await setupFn();
    });

    testFns.forEach(({ name, fn }) => {
      it(name, () => fn(setupData));
    });
  });
}

export async function cleanupTest(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _app: INestApplication,
) {
  await clearTables();
}

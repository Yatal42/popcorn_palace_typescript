import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { Movie } from '../src/movies/entities/movie.entity';
import { Theater } from '../src/theaters/entities/theater.entity';
import { Showtime } from '../src/showtimes/entities/showtime.entity';
import { Booking } from '../src/bookings/entities/booking.entity';
import { createTestDatabase } from './create-test-db';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { TestLogger } from './utils/test-logger';

process.env.NODE_ENV = 'test';
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

const logger = new TestLogger('TestSetup');
logger.log(`Setup using environment file: ${envPath}`);

process.env.DATABASE_NAME = 'popcorn_palace_test';

const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'popcorn_palace_test',
  entities: [Movie, Theater, Showtime, Booking],
  synchronize: true,
  logging: true,
});

const initializeDatabase = async () => {
  try {
    await testDataSource.initialize();
    logger.log('Database initialized and schema synchronized');
  } catch (error) {
    logger.error('Error initializing database:', error);
  }
};

const waitForDatabase = async (retries = 5, delay = 2000) => {
  await createTestDatabase();

  for (let i = 0; i < retries; i++) {
    try {
      const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: 'postgres',
      });

      await client.connect();
      await client.end();
      logger.log('Successfully connected to database');

      await initializeDatabase();
      return true;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('Error connecting to database:', error.message);
        return false;
      }
      logger.warn(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
};

const safeTruncate = async (client, tableName) => {
  try {
    await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
    logger.log(`Truncated table: ${tableName}`);
  } catch (error) {
    if (error.code === '42P01') {
      logger.log(`Table ${tableName} doesn't exist yet, skipping truncate`);
    } else {
      logger.error(`Error with table ${tableName}:`, error.message);
    }
  }
};

const clearTables = async () => {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'popcorn_palace_test',
  });

  try {
    await client.connect();
    await safeTruncate(client, 'booking');
    await safeTruncate(client, 'showtime');
    await safeTruncate(client, 'theater');
    await safeTruncate(client, 'movie');
    logger.log('Tables cleared for clean test run');
  } catch (error) {
    logger.error('Error clearing tables:', error.message);
  } finally {
    await client.end();
  }
};

beforeAll(async () => {
  await waitForDatabase();
}, 60000);

afterAll(async () => {
  await clearTables();

  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
    logger.log('Test database connection closed');
  }
});

export { waitForDatabase, clearTables, testDataSource };

import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { Movie } from '../src/movies/entities/movie.entity';
import { Theater } from '../src/theaters/entities/theater.entity';
import { Showtime } from '../src/showtimes/entities/showtime.entity';
import { Booking } from '../src/bookings/entities/booking.entity';
import { createTestDatabase } from './create-test-db';
import * as dotenv from 'dotenv';
import * as path from 'path';

process.env.NODE_ENV = 'test';
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });
console.log(`Setup using environment file: ${envPath}`);

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
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
      console.log('Database initialized and schema synchronized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
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
        database: process.env.DATABASE_NAME || 'popcorn_palace_test',
      });

      await client.connect();
      console.log('Successfully connected to database');
      await client.end();

      await initializeDatabase();
      return;
    } catch (error) {
      console.error('Error connecting to database:', error.message);
      if (i === retries - 1) {
        throw error;
      }
      console.log(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const safeTruncate = async (client, tableName) => {
  try {
    const tableExists = await client.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = $1
       )`,
      [tableName],
    );

    if (tableExists.rows[0].exists) {
      await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
      console.log(`Truncated table: ${tableName}`);
    } else {
      console.log(`Table ${tableName} doesn't exist yet, skipping truncate`);
    }
  } catch (error) {
    console.error(`Error with table ${tableName}:`, error.message);
  }
};

const clearTables = async () => {
  try {
    const client = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'popcorn_palace_test',
    });

    await client.connect();

    await safeTruncate(client, 'booking');
    await safeTruncate(client, 'showtime');
    await safeTruncate(client, 'theater');
    await safeTruncate(client, 'movie');

    console.log('Tables cleared for clean test run');
    await client.end();
  } catch (error) {
    console.error('Error clearing tables:', error.message);
  }
};

beforeAll(async () => {
  await waitForDatabase();
}, 60000);

afterAll(async () => {
  await clearTables();

  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
    console.log('Test database connection closed');
  }
});

export { waitForDatabase, clearTables, testDataSource };

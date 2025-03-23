import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { TestLogger } from './utils/test-logger';

export async function createTestDatabase(): Promise<boolean> {
  const envPath = path.resolve(process.cwd(), '.env.test');
  dotenv.config({ path: envPath });
  const logger = new TestLogger('TestDbCreator');
  logger.log(`Using environment file: ${envPath}`);

  const config = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: 'postgres',
  };

  const testDbName = process.env.DATABASE_NAME || 'popcorn_palace_test';
  const client = new Client(config);

  try {
    await client.connect();

    const dbCheckRes = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName],
    );

    if (dbCheckRes.rows.length === 0) {
      logger.log(`Creating test database: ${testDbName}`);
      await client.query(`CREATE DATABASE ${testDbName}`);
      logger.log('Test database created successfully');
    } else {
      logger.log('Test database already exists');
    }
    return true;
  } catch (err) {
    logger.error(
      'Error creating test database. Make sure the PostgreSQL server is running.',
      err,
    );
    return false;
  } finally {
    try {
      await client.end();
    } catch (err) {
      logger.error(err);
    }
  }
}

if (require.main === module) {
  const logger = new TestLogger('TestDbCreator');
  createTestDatabase()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      logger.error('Unexpected error:', err);
      process.exit(1);
    });
}

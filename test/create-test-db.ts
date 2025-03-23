import { Client } from 'pg';

export async function createTestDatabase(): Promise<boolean> {
  try {
    const client = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: 'postgres',
    });

    await client.connect();
    const checkResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'popcorn_palace_test'",
    );

    if (checkResult.rowCount === 0) {
      console.log('Creating test database: popcorn_palace_test');
      await client.query('CREATE DATABASE popcorn_palace_test');
      console.log('Test database created successfully');
    } else {
      console.log('Test database already exists');
    }
    await client.end();
    return true;
  } catch (error) {
    console.error(
      'Error setting up test database:',
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

if (require.main === module) {
  createTestDatabase()
    .then((result) => {
      process.exit(result ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

import { Client } from 'pg';

const waitForDatabase = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
      });

      await client.connect();
      console.log('Successfully connected to database');
      await client.end();
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

beforeAll(async () => {
  await waitForDatabase();
}, 30000);

afterAll(async () => {});

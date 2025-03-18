import { config } from 'dotenv';

// Set environment variables before loading .env file
process.env.NODE_ENV = 'test';
process.env.POSTGRES_DB = 'popcorn_palace_test';
process.env.POSTGRES_USER = 'popcorn_palace';
process.env.POSTGRES_PASSWORD = 'popcorn_palace';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';

// Load .env file after setting environment variables
config();
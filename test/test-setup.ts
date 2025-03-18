import { config } from 'dotenv';

process.env.NODE_ENV = 'test';
process.env.POSTGRES_DB = 'popcorn_palace_test';
process.env.POSTGRES_USER = 'popcorn_palace';
process.env.POSTGRES_PASSWORD = 'popcorn_palace';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';

config();

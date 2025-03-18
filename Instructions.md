# Popcorn Palace Movie Ticket Booking System - Instructions

## Overview
The Popcorn Palace Movie Ticket Booking System is a backend service designed to handle movie ticket booking operations. This implementation uses NestJS with TypeScript and PostgreSQL for database storage.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Docker and Docker Compose (for PostgreSQL)

## Setup and Installation

1. Clone the repository
```bash
git clone <repository-url>
cd popcorn_palace_typescript
```

2. Install dependencies
```bash
npm install
```

3. Create environment files

Create a `.env` file in the root directory:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=popcorn_palace
DATABASE_PASSWORD=popcorn_palace
DATABASE_NAME=popcorn_palace
NODE_ENV=development
```

For testing, create `.env.test`:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=postgres
NODE_ENV=test
```

## Building the Application

To build the application:
```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `dist` directory.

## Running the Application

1. Start the PostgreSQL database using Docker:
```bash
docker compose up -d
```

2. Run the application:
```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run start:prod
```

The application will be available at http://localhost:3000

## Testing the Application

### End-to-End Tests

The application includes comprehensive end-to-end tests that verify all API endpoints:

```bash
# Run end-to-end tests
npm run test:e2e
```

These tests follow the NestJS testing guidelines (https://docs.nestjs.com/fundamentals/testing) and include:

- Creating and retrieving movies
- Managing theaters
- Scheduling showtimes
- Booking seats with validation
- Error handling for invalid operations

The e2e tests use:
- Jest as the testing framework
- SuperTest for HTTP assertions
- TypeORM for database testing with a separate test database
- Test database is reset between test runs using `dropSchema: true`

### Unit Tests

To run unit tests:
```bash
# Run unit tests
npm run test

# Generate test coverage report
npm run test:cov
```

## API Documentation

### Movies API
- `GET /movies` - Get all movies
  - Response example: `[{"id": 1, "title": "Sample Movie Title 1", "genre": "Action", "duration": 120, "rating": 8.7, "releaseYear": 2025}, ...]`
- `GET /movies/:id` - Get movie by ID
- `POST /movies` - Add a new movie
  - Request body example: `{"title": "Sample Movie Title", "genre": "Action", "duration": 120, "rating": 8.7, "releaseYear": 2025}`
- `PATCH /movies/:id` - Update a movie
- `DELETE /movies/:id` - Delete a movie

### Theaters API
- `GET /theaters` - Get all theaters
- `GET /theaters/:id` - Get theater by ID
- `POST /theaters` - Add a new theater
  - Request body example: `{"name": "Sample Theater", "capacity": 120}`
- `PATCH /theaters/:id` - Update a theater
- `DELETE /theaters/:id` - Delete a theater

### Showtimes API
- `GET /showtimes` - Get all showtimes
- `GET /showtimes/:id` - Get showtime by ID
  - Response example: `{"id": 1, "price": 50.2, "movieId": 1, "theater": "Sample Theater", "startTime": "2025-02-14T11:47:46.125405Z", "endTime": "2025-02-14T14:47:46.125405Z"}`
- `POST /showtimes` - Create a new showtime
  - Request body example: `{"movieId": 1, "theater": "Sample Theater", "startTime": "2025-02-14T11:47:46.125405Z", "endTime": "2025-02-14T14:47:46.125405Z", "price": 20.2}`
- `PATCH /showtimes/:id` - Update a showtime
- `DELETE /showtimes/:id` - Delete a showtime

### Bookings API
- `GET /bookings` - Get all bookings
- `GET /bookings/:id` - Get booking by ID
- `POST /bookings` - Create a new booking
  - Request body example: `{"showtimeId": 1, "seatNumber": 15, "userId": "84438967-f68f-4fa0-b620-0f08217e76af"}`
  - Response example: `{"id": "d1a6423b-4469-4b00-8c5f-e3cfc42eacae", ...}`
- `DELETE /bookings/:id` - Delete a booking

## Troubleshooting

### Database Connection Issues
- Check if the Docker container is running: `docker ps`
- Verify database logs: `docker logs popcorn_palace_typescript-db-1`
- Check environment variables match the Docker Compose configuration

### Test Failures
- Ensure PostgreSQL container is running
- Check `.env.test` configuration
- Run tests with `--verbose` flag for more details: `npm run test:e2e -- --verbose`

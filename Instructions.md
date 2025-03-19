# Popcorn Palace API - Instructions

This document provides instructions for setting up and using the Popcorn Palace movie theater API.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Docker (for PostgreSQL database)

## Environment Setup

1. Create a `.env` file in the root directory with the following:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=popcorn_palace
```

For testing, the application uses a separate test database with the same credentials but with `_test` appended to the database name.

## Database Setup

The application uses PostgreSQL which runs in Docker. To start the database:

```bash
docker-compose up -d
```

When the application starts, it will automatically create the necessary tables in the database using TypeORM.

## Building and Running

1. Install dependencies:

```bash
npm install
```

2. Build the application:

```bash
npm run build
```

3. Start the application:

```bash
# Development mode
npm run start:dev

# Production mode
npm run start
```

The API will be available at `http://localhost:3000`.

## Testing

### End-to-End Tests

Run all end-to-end tests:

```bash
npm run test:e2e
```

Run a specific test file:

```bash
npm run test:e2e -- test/movies/movies.e2e-spec.ts
```

### Test Structure

The tests are organized by entity:
- `test/movies/movies.e2e-spec.ts`
- `test/theaters/theaters.e2e-spec.ts`
- `test/showtimes/showtimes.e2e-spec.ts`
- `test/bookings/bookings.e2e-spec.ts`

Each test follows the same pattern:
1. Setting up the application
2. Creating test data
3. Testing API endpoints
4. Cleanup

### Test Utilities

The tests use utility functions in `test/setup.ts` to:
- Initialize the database
- Clean up tables between tests
- Set up the test application

### Interpreting Test Results

All tests should pass successfully. If tests fail, check the error messages for detailed information about what went wrong.

### Unit Tests

Run unit tests:

```bash
npm run test
```

## API Documentation

### Movies API

#### `GET /movies`
Returns a list of all movies.

Query parameters:
- `title`: Filter movies by title

Example response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "The Matrix",
    "genre": "Sci-Fi",
    "releaseYear": 1999,
    "durationMinutes": 136
  }
]
```

#### `GET /movies/:id`
Returns a specific movie by ID.

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "releaseYear": 1999,
  "durationMinutes": 136
}
```

#### `POST /movies`
Creates a new movie.

Request body:
```json
{
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "releaseYear": 1999,
  "durationMinutes": 136
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "releaseYear": 1999,
  "durationMinutes": 136
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 500 Internal Server Error: Server error

#### `PUT /movies/:id`
Updates an existing movie.

Request body:
```json
{
  "title": "The Matrix Reloaded",
  "genre": "Sci-Fi",
  "releaseYear": 2003,
  "durationMinutes": 138
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "The Matrix Reloaded",
  "genre": "Sci-Fi",
  "releaseYear": 2003,
  "durationMinutes": 138
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 404 Not Found: Movie not found
- 500 Internal Server Error: Server error

#### `DELETE /movies/:id`
Deletes a movie.

Example response:
```json
{
  "message": "Movie deleted successfully"
}
```

Error responses:
- 404 Not Found: Movie not found
- 400 Bad Request: Cannot delete movie that has showtimes
- 500 Internal Server Error: Server error

### Theaters API

#### `GET /theaters`
Returns a list of all theaters.

Example response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Main Theater",
    "capacity": 200
  }
]
```

#### `GET /theaters/:id`
Returns a specific theater by ID.

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Main Theater",
  "capacity": 200
}
```

#### `POST /theaters`
Creates a new theater.

Request body:
```json
{
  "name": "Main Theater",
  "capacity": 200
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Main Theater",
  "capacity": 200
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 500 Internal Server Error: Server error

#### `PUT /theaters/:id`
Updates an existing theater.

Request body:
```json
{
  "name": "VIP Theater",
  "capacity": 100
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "VIP Theater",
  "capacity": 100
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 404 Not Found: Theater not found
- 500 Internal Server Error: Server error

#### `DELETE /theaters/:id`
Deletes a theater.

Example response:
```json
{
  "message": "Theater deleted successfully"
}
```

Error responses:
- 404 Not Found: Theater not found
- 400 Bad Request: Cannot delete theater that has showtimes
- 500 Internal Server Error: Server error

### Showtimes API

#### `GET /showtimes`
Returns a list of all showtimes.

Example response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startTime": "2023-07-15T18:00:00Z",
    "price": 12.50,
    "movie": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "The Matrix"
    },
    "theater": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Main Theater"
    }
  }
]
```

#### `GET /showtimes/:id`
Returns a specific showtime by ID.

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "startTime": "2023-07-15T18:00:00Z",
  "price": 12.50,
  "movie": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "The Matrix"
  },
  "theater": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Main Theater"
  }
}
```

#### `POST /showtimes`
Creates a new showtime.

Request body:
```json
{
  "startTime": "2023-07-15T18:00:00Z",
  "price": 12.50,
  "movieId": "123e4567-e89b-12d3-a456-426614174000",
  "theaterId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "startTime": "2023-07-15T18:00:00Z",
  "price": 12.50,
  "movie": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "The Matrix"
  },
  "theater": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Main Theater"
  }
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 404 Not Found: Movie or theater not found
- 500 Internal Server Error: Server error

#### `PUT /showtimes/:id`
Updates an existing showtime.

Request body:
```json
{
  "startTime": "2023-07-15T20:00:00Z",
  "price": 15.00,
  "movieId": "123e4567-e89b-12d3-a456-426614174000",
  "theaterId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "startTime": "2023-07-15T20:00:00Z",
  "price": 15.00,
  "movie": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "The Matrix"
  },
  "theater": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Main Theater"
  }
}
```

Error responses:
- 400 Bad Request: Missing or invalid fields
- 404 Not Found: Showtime, movie, or theater not found
- 500 Internal Server Error: Server error

#### `DELETE /showtimes/:id`
Deletes a showtime.

Example response:
```json
{
  "message": "Showtime deleted successfully"
}
```

Error responses:
- 404 Not Found: Showtime not found
- 400 Bad Request: Cannot delete showtime that has bookings
- 500 Internal Server Error: Server error

### Bookings API

#### `GET /bookings`
Returns a list of all bookings.

Example response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "seatCount": 2,
    "showtime": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "startTime": "2023-07-15T18:00:00Z",
      "movie": {
        "title": "The Matrix"
      },
      "theater": {
        "name": "Main Theater"
      }
    }
  }
]
```

#### `GET /bookings/:id`
Returns a specific booking by ID.

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "seatCount": 2,
  "showtime": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startTime": "2023-07-15T18:00:00Z",
    "movie": {
      "title": "The Matrix"
    },
    "theater": {
      "name": "Main Theater"
    }
  }
}
```

#### `POST /bookings`
Creates a new booking.

Request body:
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "seatCount": 2,
  "showtimeId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Example response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "seatCount": 2,
  "showtime": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "startTime": "2023-07-15T18:00:00Z",
    "movie": {
      "title": "The Matrix"
    },
    "theater": {
      "name": "Main Theater"
    }
  }
}
```

Error responses:
- 400 Bad Request: Missing fields, invalid email, or not enough seats available
- 404 Not Found: Showtime not found
- 500 Internal Server Error: Server error

#### `DELETE /bookings/:id`
Deletes a booking.

Example response:
```json
{
  "message": "Booking deleted successfully"
}
```

Error responses:
- 404 Not Found: Booking not found
- 500 Internal Server Error: Server error

## Troubleshooting

### Database Connection Issues

- Ensure Docker is running
- Check that the PostgreSQL container is running with `docker ps`
- Verify the database credentials in your `.env` file match the database configuration

### Test Failures

Common issues that might cause test failures:
- Database connection problems
- Missing environment variables
- Outdated or missing dependencies

If tests are failing, try:
- Restarting the database container
- Rebuilding the application with `npm run build`
- Running `npm install` to ensure all dependencies are up-to-date

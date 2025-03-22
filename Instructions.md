# Popcorn Palace API - Instructions

This document provides instructions for setting up and using the Popcorn Palace movie theater API.

## Quick Start

1. **Set up environment:**
   ```bash
   # Clone the repository and install dependencies
   npm install
   
   # Start the database
   docker-compose up -d
   
   # Start the application in development mode
   npm run start:dev
   ```

2. **Run tests:**
   ```bash
   # Run all end-to-end tests
   npm run test:e2e
   ```

The API will be available at `http://localhost:3000`.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Docker (for PostgreSQL database)

## Detailed Setup

### Environment Configuration

Create a `.env` file in the root directory with:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=popcorn_palace
```

For testing, the application automatically uses a separate test database with `_test` appended to the database name.

### Database Setup

The application uses PostgreSQL in Docker. TypeORM automatically creates the necessary tables when the application starts.

### Building and Running

For development:
```bash
npm run start:dev  # Auto-reloads on file changes
```

For production deployment:
```bash
npm run build
npm run start
```

## Features

### Logging System

The application includes a centralized logging system based on NestJS's built-in Logger:

- **Configuration:** Log levels are set in `main.ts`
- **Methods:**
  - `log()` - Standard information
  - `error()` - Error details with stack traces
  - `warn()` - Warning messages
  - `debug()` - Detailed debugging information
  - `logDatabaseError()` - Enhanced database error reporting

### Error Handling

The application implements consistent error handling:

- HTTP status codes for appropriate error responses
- Service-level try-catch blocks for graceful error handling
- Special handling for database-specific errors

## Testing

### Running Tests

```bash
# Run all end-to-end tests
npm run test:e2e

# Run a specific test file
npm run test:e2e -- test/movies/movies.e2e-spec.ts
```

## API Reference

### Movies API

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/movies` | GET | List all movies | `title` (optional): Filter by title |
| `/movies/:id` | GET | Get movie by ID | None |
| `/movies` | POST | Create new movie | None |
| `/movies/:id` | PATCH | Update movie | None |
| `/movies/:id` | DELETE | Delete movie | None |

**Example request (Create movie):**
```json
POST /movies
{
  "title": "The Matrix",
  "genre": "Sci-Fi",
  "releaseYear": 1999,
  "durationInMinutes": 136
}
```

### Theaters API

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/theaters` | GET | List all theaters | `name` (optional): Filter by name |
| `/theaters/:id` | GET | Get theater by ID | None |
| `/theaters` | POST | Create new theater | None |
| `/theaters/:id` | PATCH | Update theater | None |
| `/theaters/:id` | DELETE | Delete theater | None |

**Example request (Create theater):**
```json
POST /theaters
{
  "name": "Main Theater",
  "capacity": 200
}
```

### Showtimes API

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/showtimes` | GET | List all showtimes | None |
| `/showtimes/:id` | GET | Get showtime by ID | None |
| `/showtimes` | POST | Create new showtime | None |
| `/showtimes/:id` | PATCH | Update showtime | None |
| `/showtimes/:id` | DELETE | Delete showtime | None |

**Example request (Create showtime):**
```json
POST /showtimes
{
  "startTime": "2023-07-15T18:00:00Z",
  "price": 12.50,
  "movieId": 123,
  "theaterId": 456
}
```

### Bookings API

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/bookings` | GET | List all bookings | `userId` (optional): Filter by user ID |
| `/bookings/:id` | GET | Get booking by ID | None |
| `/bookings` | POST | Create new booking | None |
| `/bookings/:id` | DELETE | Delete booking | None |

**Example request (Create booking):**
```json
POST /bookings
{
  "userId": "user-123",
  "seatNumber": 15,
  "showtimeId": 123,
  "idempotencyKey": "2e8f7f18-98ca-4e87-8076-94bcd60464c5"
}
```

## Common Errors and Solutions

| Status Code | Meaning | Common Causes | Solution |
|-------------|---------|--------------|----------|
| 400 | Bad Request | Invalid input data, business rule violation | Check request data against API documentation |
| 404 | Not Found | Resource doesn't exist | Verify IDs are correct |
| 409 | Conflict | Resource conflict (e.g., duplicate booking) | Use idempotency key for bookings |
| 500 | Server Error | Database error, internal error | Check logs for details |

## Troubleshooting

### Database Issues
- Verify Docker is running: `docker ps`
- Ensure database credentials match `.env` file

### Test Failures
- Clear test database: `docker-compose down -v && docker-compose up -d`
- Rebuild application: `npm run build`

### Logging Issues
- Check error details in console output
- Verify log level configuration in `main.ts`

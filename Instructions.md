# Popcorn Palace API - Instructions

This document provides instructions for setting up and using the Popcorn Palace movie theater API.

## Quick Start

1. **Set up environment:**
   ```bash
   # Clone the repository and install dependencies
   npm install
   
   # Start the database
   docker compose up -d
   
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

- **Node.js**: A recent version of Node.js
- **npm**: Compatible with your Node.js version
- **Docker**: Docker with Docker Compose support
  - 2GB+ available memory for containers
- **Operating System**:
  - macOS, Windows with WSL2, or Linux
- **Development**:
  - Git
  - Terminal application
  - 4GB+ RAM
  - 10GB+ free disk space

## Detailed Setup

### Environment Configuration

The application uses two environment files:

1. **For development**: Create a `.env` file in the root directory with:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=popcorn_palace
NODE_ENV=development
PORT=3000
```

2. **For testing**: Create a `.env.test` file in the root directory with:

```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=popcorn_palace_test
NODE_ENV=test
```

> **Note**: The application has default values for these settings, but it's recommended to create the appropriate environment files to avoid connection issues. Make sure your PostgreSQL server allows connections with the specified credentials.

### Database Setup

The application uses PostgreSQL in Docker. TypeORM automatically creates the necessary tables when the application starts.

### Building and Running

For development:
```bash
npm run start:dev  
```

For production deployment:
```bash
npm run build
npm run start:prod  
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
# Run all end-to-end tests (creates test DB, runs tests, exits)
npm run test:e2e

# Run unit tests
npm run test

# Run a specific end-to-end test file
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

**Example request (Update movie):**
```json
PATCH /movies/1
{
  "durationInMinutes": 150
}
```

> **Note**: For update operations, all fields are optional. The API uses `UpdateMovieDto` which extends `PartialType(CreateMovieDto)`, allowing you to update only the fields you want to change while keeping existing values for fields not included in the request.

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

**Example request (Update theater):**
```json
PATCH /theaters/1
{
  "capacity": 250
}
```

> **Note**: For update operations, all fields are optional, allowing you to update only the fields you want to change while keeping existing values for fields not included in the request.

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

**Example request (Update showtime):**
```json
PATCH /showtimes/1
{
  "price": 14.99
}
```

> **Note**: For update operations, all fields are optional, allowing you to update only the fields you want to change while keeping existing values for fields not included in the request.

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
  "showtimeId": 123
}
```

## Common Errors and Solutions

| Status Code | Meaning | Common Causes | Solution |
|-------------|---------|--------------|----------|
| 400 | Bad Request | Invalid input data, business rule violation | Check request data against API documentation |
| 404 | Not Found | Resource doesn't exist | Verify IDs are correct |
| 409 | Conflict | Resource conflict (e.g., duplicate booking) | Ensure seat is not already booked for that showtime |
| 500 | Server Error | Database error, internal error | Check logs for details |

## Troubleshooting

### Database Issues
- Verify Docker is running: `docker ps`
- Ensure database credentials match `.env` file

### Test Failures
- Clear test database: `docker compose down -v && docker compose up -d`
- Rebuild application: `npm run build`

### Logging Issues
- Check error details in console output
- Verify log level configuration in `main.ts`

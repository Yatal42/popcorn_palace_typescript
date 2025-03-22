import { IsInt, IsUUID, Min, IsPositive, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @IsPositive({ message: 'Showtime ID must be a positive number' })
  showtimeId: number;

  @IsInt()
  @Min(1, { message: 'Seat number must be at least 1' })
  seatNumber: number;

  @IsUUID('4', { message: 'User ID must be a valid UUID v4' })
  userId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Idempotency key must be a valid UUID v4' })
  idempotencyKey?: string;
}

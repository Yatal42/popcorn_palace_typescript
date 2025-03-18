import { IsNumber, IsString, Min, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsNumber()
  @IsNotEmpty()
  showtimeId: number;

  @IsNumber()
  @Min(1)
  seatNumber: number;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

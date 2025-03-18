import { IsString, IsNumber, Min, Max, Length, IsNotEmpty } from 'class-validator';

export class CreateTheaterDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsNumber()
  @Min(1)
  @Max(1000) // Reasonable maximum capacity
  capacity: number;
}

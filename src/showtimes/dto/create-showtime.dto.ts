import {
  IsNumber,
  IsDateString,
  Min,
  IsNotEmpty,
  ValidateIf,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateShowtimeDto {
  @IsNumber()
  @IsNotEmpty()
  movieId: number;

  @IsString()
  @IsNotEmpty()
  theater: string;

  @IsDateString()
  @IsNotEmpty()
  @ValidateIf((o) => {
    const date = new Date(o.startTime);
    return !isNaN(date.getTime()) && date < new Date();
  })
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  @ValidateIf((o) => {
    const start = new Date(o.startTime);
    const end = new Date(o.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    return end <= start;
  })
  endTime: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  price: number;
}

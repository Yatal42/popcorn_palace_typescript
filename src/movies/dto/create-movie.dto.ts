import {
  IsString,
  IsNumber,
  Min,
  Max,
  Length,
  IsNotEmpty,
} from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  genre: string;

  @IsNumber()
  @Min(1)
  @Max(600) // 10 hours max
  durationInMinutes: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  rating: number;

  @IsNumber()
  @Min(1900)
  releaseYear: number;
}

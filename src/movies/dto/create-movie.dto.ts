import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  Length,
  IsNotEmpty,
} from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Title must be between 1 and 100 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  genre: string;

  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(600, { message: 'Duration cannot exceed 10 hours (600 minutes)' })
  durationInMinutes: number;

  @IsNumber()
  @Min(0, { message: 'Rating cannot be negative' })
  @Max(10, { message: 'Rating cannot exceed 10' })
  rating: number;

  @IsInt()
  @Min(1900, { message: 'Release year must be after 1900' })
  @Max(2100, { message: 'Release year seems too far in the future' })
  releaseYear: number;
}

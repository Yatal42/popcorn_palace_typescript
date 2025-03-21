import { IsString, IsNumber, Min, Length, IsNotEmpty } from 'class-validator';

export class CreateTheaterDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsNumber()
  @Min(1)
  capacity: number;
}

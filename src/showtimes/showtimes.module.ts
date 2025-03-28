import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Showtime } from './entities/showtime.entity';
import { ShowtimesController } from './showtimes.controller';
import { ShowtimesService } from './showtimes.service';
import { MoviesModule } from '../movies/movies.module';
import { TheatersModule } from '../theaters/theaters.module';

@Module({
  imports: [TypeOrmModule.forFeature([Showtime]), MoviesModule, TheatersModule],
  controllers: [ShowtimesController],
  providers: [ShowtimesService],
  exports: [ShowtimesService],
})
export class ShowtimesModule {}

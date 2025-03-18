import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ShowtimesModule } from '../showtimes/showtimes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), ShowtimesModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

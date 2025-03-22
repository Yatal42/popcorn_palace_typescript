import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ShowtimesService } from './showtimes.service';
import { CreateShowtimeDto } from './dto/create-showtime.dto';
import { UpdateShowtimeDto } from './dto/update-showtime.dto';

@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimesService: ShowtimesService) {}

  @Post()
  @HttpCode(200)
  create(@Body() createShowtimeDto: CreateShowtimeDto) {
    return this.showtimesService.create(createShowtimeDto);
  }

  @Get()
  findAll() {
    return this.showtimesService.findAll();
  }

  @Get(':showtimeId')
  findOne(@Param('showtimeId', ParseIntPipe) showtimeId: number) {
    return this.showtimesService.findOne(showtimeId);
  }

  @Post('update/:showtimeId')
  @HttpCode(200)
  update(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
    @Body() updateShowtimeDto: UpdateShowtimeDto,
  ) {
    return this.showtimesService.update(showtimeId, updateShowtimeDto);
  }

  @Patch(':showtimeId')
  @HttpCode(200)
  patchUpdate(
    @Param('showtimeId', ParseIntPipe) showtimeId: number,
    @Body() updateShowtimeDto: UpdateShowtimeDto,
  ) {
    return this.showtimesService.update(showtimeId, updateShowtimeDto);
  }

  @Delete(':showtimeId')
  @HttpCode(200)
  remove(@Param('showtimeId', ParseIntPipe) showtimeId: number) {
    return this.showtimesService.remove(showtimeId);
  }
}

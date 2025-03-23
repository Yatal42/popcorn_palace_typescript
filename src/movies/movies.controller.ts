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
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @HttpCode(200)
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.moviesService.create(createMovieDto);
  }

  @Get('all')
  findAll() {
    return this.moviesService.findAll();
  }

  @Get()
  findAllDefault() {
    return this.moviesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.findOne(id);
  }

  @Post('update/:movieTitle')
  @HttpCode(200)
  update(
    @Param('movieTitle') movieTitle: string,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.updateByTitle(movieTitle, updateMovieDto);
  }

  @Patch(':id')
  @HttpCode(200)
  patchUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovieDto: UpdateMovieDto,
  ) {
    return this.moviesService.update(id, updateMovieDto);
  }

  @Delete('title/:movieTitle')
  @HttpCode(200)
  removeByTitle(@Param('movieTitle') movieTitle: string) {
    return this.moviesService.removeByTitle(movieTitle);
  }

  @Delete(':id')
  @HttpCode(200)
  removeById(@Param('id', ParseIntPipe) id: number) {
    return this.moviesService.remove(id);
  }
}

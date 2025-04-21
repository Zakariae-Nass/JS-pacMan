import { Controller, Get, Param, Post, Body,NotFoundException } from '@nestjs/common';
import { GamesService } from './game.service';
import { CreateGameDto } from './create-game.dto';

  
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

 // Modifier pour chercher par username au lieu de id
 @Get(':playerid')

  async findLast(@Param('playerid') playerid: string) {
    return await this.gamesService.findLast(parseInt(playerid));
  }

  @Post()
  async create(@Body() createGameDto: CreateGameDto) {
    return this.gamesService.create(createGameDto);
  }
}
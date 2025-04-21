import { Controller, Get, Param, Post, Body,NotFoundException } from '@nestjs/common';
import { PlayersService } from './players.service';

interface CreatePlayerDto {
  username: string;
}
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

 // Modifier pour chercher par username au lieu de id
 @Get(':username')
 async findOne(@Param('username') username: string) {
   const player = await this.playersService.findByUsername(username);
   if (!player) {
     throw new NotFoundException(`Joueur avec le nom ${username} non trouvé`);
   }
   return player;
 }

 @Post()
 create(@Body() createPlayerDto: CreatePlayerDto) {
   return this.playersService.create(createPlayerDto.username);
 }
}
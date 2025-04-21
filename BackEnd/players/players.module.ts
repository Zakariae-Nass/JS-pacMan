import { Module } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';

@Module({
  providers: [PlayersService,DatabaseService],
  controllers: [PlayersController],
  exports: [PlayersService]
})
export class PlayersModule {}

import { Module } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { GamesService } from './game.service';
import { GamesController } from './games.controller';
import { PlayersModule } from '../players/players.module';
@Module({
  imports: [PlayersModule],
  providers: [GamesService,DatabaseService],
  controllers: [GamesController],
})
export class GamesModule {}

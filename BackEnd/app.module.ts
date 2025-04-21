import { Module } from '@nestjs/common';
import { PlayersModule } from './players/players.module';
import { DatabaseService } from './database/database.service';
import { GamesModule } from './games/game.module';

@Module({
    imports: [
        PlayersModule,
        GamesModule
    ],
    providers: [DatabaseService],
    exports: [DatabaseService], 
})
export class AppModule {}

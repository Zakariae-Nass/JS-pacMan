import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGameDto } from './create-game.dto';
import { PlayersService } from '../players/players.service';
@Injectable()
export class GamesService {
  constructor(private db: DatabaseService,private readonly playersService: PlayersService) {}

async findLast(id: number) {
  console.log('Looking for games with player_id:', id);
  
  const result = await this.db.query(
    'SELECT * FROM games WHERE player_id = ? ORDER BY played_at DESC LIMIT 1',
    [id]
  );
 
  console.log('Query result:', result);
  
  if (!result || result.length === 0) {
    throw new NotFoundException('Aucune partie trouvée pour player'+id);
  }
 
  return result[0];
}
  
  async create({player_id, score}) {

    const result = await this.db.query(
      `INSERT INTO games (player_id, score)
       VALUES (?, ?)`,
      [player_id, score]
    );

    return result[0];
  }


}
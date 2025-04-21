import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';


@Injectable()
export class PlayersService {
  constructor(private db: DatabaseService) {}

  async findOne(id: number) {
    const result = await this.db.query(
      'SELECT id, username, created_at FROM players WHERE id = ?', 
      [id]
    );
    if(!result || result.length === 0) throw new NotFoundException(`Player with id ${id} not found`);
    return result[0];
  }

  async findByUsername(username: string) {
    const result = await this.db.query(
      'SELECT * FROM players WHERE username = ?',
      [username]
    );
    return result && result.length > 0 ? result[0] : null;
  }

  async create(username: string) {
    const result = await this.db.query(
      'INSERT INTO players (username) VALUES (?)',
      [username]
    );
    
    return this.findOne(result.insertId);
  }
}

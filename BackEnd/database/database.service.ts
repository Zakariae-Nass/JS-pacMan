import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private connection: mysql.Pool;

  constructor() {
    // Créer un pool de connexions
    this.connection = mysql.createPool({
      host: 'localhost',   // WampServer s'exécute localement
      user: 'root',        // Utilisateur par défaut de WampServer
      password: '',        // Mot de passe vide par défaut sur WampServer
      database: 'pacman',  // Nom de votre base de données
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async onModuleInit() {
    // Vérifier la connexion à la base de données au démarrage
    try {
      const connection = await this.connection.getConnection();
      console.log('Successfully connected to MySQL database');
      connection.release();
    } catch (error) {
      console.error('Failed to connect to MySQL database:', error);
      throw error;
    }
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const [results] = await this.connection.execute(sql, params);
    return results;
  }
}
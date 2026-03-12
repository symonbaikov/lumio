import * as path from 'path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://finflow:finflow@localhost:5432/finflow';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

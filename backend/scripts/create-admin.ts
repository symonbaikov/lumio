import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Branch } from '../src/entities/branch.entity';
import { Category } from '../src/entities/category.entity';
import { GoogleSheetRow } from '../src/entities/google-sheet-row.entity';
import { GoogleSheet } from '../src/entities/google-sheet.entity';
import { Statement } from '../src/entities/statement.entity';
import { TelegramReport } from '../src/entities/telegram-report.entity';
import { Transaction } from '../src/entities/transaction.entity';
import { User, UserRole } from '../src/entities/user.entity';
import { Wallet } from '../src/entities/wallet.entity';

async function createAdmin() {
  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://lumio:lumio@localhost:5432/lumio';

  // Parse DATABASE_URL
  let username: string;
  let password: string;
  let host: string;
  let port: number;
  let database: string;

  try {
    const url = new URL(databaseUrl);
    username = url.username;
    password = url.password;
    host = url.hostname;
    port = Number.parseInt(url.port) || 5432;
    database = url.pathname.slice(1);
  } catch (error) {
    // Fallback to direct connection parameters
    username = process.env.DB_USERNAME || 'lumio';
    password = process.env.DB_PASSWORD || 'lumio';
    host = process.env.DB_HOST || 'localhost';
    port = Number.parseInt(process.env.DB_PORT || '5432');
    database = process.env.DB_NAME || 'lumio';
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [
      User,
      Statement,
      GoogleSheet,
      GoogleSheetRow,
      TelegramReport,
      Category,
      Branch,
      Wallet,
      Transaction,
    ],
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'Administrator';

    // Check if admin already exists
    const existingUser = await dataSource.getRepository(User).findOne({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role === UserRole.ADMIN) {
        // Update password and ensure user is active
        existingUser.passwordHash = await bcrypt.hash(password, 10);
        existingUser.isActive = true;
        await dataSource.getRepository(User).save(existingUser);
        console.log(`✅ Updated admin user ${email} (password updated, account activated)`);
        await dataSource.destroy();
        return;
      }

      // Update existing user to admin
      existingUser.role = UserRole.ADMIN;
      existingUser.passwordHash = await bcrypt.hash(password, 10);
      existingUser.isActive = true;
      await dataSource.getRepository(User).save(existingUser);
      console.log(`✅ Updated user ${email} to admin role`);
      await dataSource.destroy();
      return;
    }

    // Create new admin user
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = dataSource.getRepository(User).create({
      email,
      passwordHash,
      name,
      role: UserRole.ADMIN,
      isActive: true,
    });

    await dataSource.getRepository(User).save(admin);
    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`\n⚠️  IMPORTANT: Change the password after first login!`);

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

createAdmin();

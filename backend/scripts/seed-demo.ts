import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../src/data-source';
import {
  BalanceAccount,
  Category,
  TaxRate,
  User,
  Workspace,
  WorkspaceMember,
} from '../src/entities';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  seedDemoData,
} from '../src/common/utils/seed-demo.util';

async function seedDemo() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await seedDemoData({
      userRepository: AppDataSource.getRepository(User),
      workspaceRepository: AppDataSource.getRepository(Workspace),
      workspaceMemberRepository: AppDataSource.getRepository(WorkspaceMember),
      categoryRepository: AppDataSource.getRepository(Category),
      taxRateRepository: AppDataSource.getRepository(TaxRate),
      balanceAccountRepository: AppDataSource.getRepository(BalanceAccount),
      hashPassword: password => bcrypt.hash(password, 10),
    });

    console.log('Demo data is ready.');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
  } catch (error) {
    console.error('Failed to seed demo user:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seedDemo();

import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User, UserRole, Workspace } from '../src/entities';
import { BalanceService } from '../src/modules/balance/balance.service';
import { CategoriesService } from '../src/modules/categories/categories.service';
import { TaxRatesService } from '../src/modules/tax-rates/tax-rates.service';
import { WorkspacesService } from '../src/modules/workspaces/workspaces.service';

const DEMO_EMAIL = 'demo@finflow.dev';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'Demo User';

async function seedDemo() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    const userRepository = dataSource.getRepository(User);
    const workspaceRepository = dataSource.getRepository(Workspace);
    const workspacesService = app.get(WorkspacesService);
    const categoriesService = app.get(CategoriesService);
    const taxRatesService = app.get(TaxRatesService);
    const balanceService = app.get(BalanceService);

    let user = await userRepository.findOne({
      where: { email: DEMO_EMAIL },
      select: ['id', 'email', 'name', 'role', 'workspaceId', 'isActive'],
    });

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    if (!user) {
      user = await userRepository.save(
        userRepository.create({
          email: DEMO_EMAIL,
          passwordHash,
          name: DEMO_NAME,
          role: UserRole.USER,
          isActive: true,
        }),
      );
      console.log(`Created demo user: ${DEMO_EMAIL}`);
    } else {
      await userRepository.update(user.id, {
        passwordHash,
        isActive: true,
        name: user.name || DEMO_NAME,
      });
      user = await userRepository.findOneOrFail({
        where: { id: user.id },
      });
      console.log(`Updated demo user password: ${DEMO_EMAIL}`);
    }

    let workspace =
      user.workspaceId === null
        ? null
        : await workspaceRepository.findOne({
            where: { id: user.workspaceId },
          });

    if (!workspace) {
      workspace = await workspacesService.ensureUserWorkspace(user);
      console.log(`Created workspace: ${workspace.name}`);
    }

    await categoriesService.createSystemCategories(workspace.id, user.id);
    await taxRatesService.createDefaultTaxRates(workspace.id);
    await balanceService.seedDefaultAccounts(workspace.id);

    console.log('Demo data is ready.');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
  } catch (error) {
    console.error('Failed to seed demo user:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

seedDemo();

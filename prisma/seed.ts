import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-shared';

const prisma = new PrismaClient();

seedDatabase(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

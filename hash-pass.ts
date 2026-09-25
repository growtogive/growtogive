import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  const hashedPassword = await bcrypt.hash('James0126SECURE!', 10);
  
  await prisma.user.update({
    where: { email: 'admin@growtogive.com' },
    data: { password: hashedPassword },
  });

  console.log('Password successfully hashed and updated!');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
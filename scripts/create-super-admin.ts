import 'dotenv/config';
import * as readline from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

let prisma: PrismaClient | undefined;

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  console.log('\n====================================');
  console.log('   Yuthika Organics');
  console.log('   Create SUPER_ADMIN');
  console.log('====================================\n');

  const email = await askQuestion('Email: ');
  const phone = await askQuestion('Phone: ');
  const firstName = await askQuestion('First name: ');
  const lastName = await askQuestion('Last name: ');
  const password = await askQuestion('Password: ');

  if (!email || !phone || !firstName || !password) {
    throw new Error(
      'Email, phone, first name and password are required.',
    );
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { phone },
      ],
    },
  });

  if (existingUser) {
    throw new Error(
      `A user already exists with this email or phone. User ID: ${existingUser.id}`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      phone,
      firstName,
      lastName: lastName || null,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('\n====================================');
  console.log('SUPER_ADMIN created successfully');
  console.log('====================================');
  console.log(`ID:    ${user.id}`);
  console.log(`Email: ${user.email}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Role:  ${user.role}`);
  console.log('====================================\n');
}

main()
  .catch((error) => {
    console.error('\nFailed to create SUPER_ADMIN.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
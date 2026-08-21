import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ [Database] Connected to relational database successfully');
  } catch (error) {
    console.error('❌ [Database] Connection failed:', error);
    process.exit(1);
  }
}

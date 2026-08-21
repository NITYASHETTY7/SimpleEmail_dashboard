import { prisma } from './config/db';

async function seed() {
  console.log('🌱 Seeding sample user & sender accounts...');

  // Create demo user (Oliver Brown)
  await prisma.user.upsert({
    where: { email: 'oliver.brown@domain.io' },
    update: {},
    create: {
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleId: 'demo-google-user-oliver',
    },
  });

  // Create sender account
  await prisma.senderAccount.upsert({
    where: { email: 'oliver.brown@domain.io' },
    update: {},
    create: {
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      hourlyLimit: 100,
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
    },
  });

  // Clean up any old mock preview emails
  await prisma.emailJob.deleteMany({
    where: {
      etherealUrl: {
        contains: 'sample-preview',
      },
    },
  });

  console.log('✅ Clean seed completed!');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

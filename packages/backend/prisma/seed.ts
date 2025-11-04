import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin@123456'; // Change this in production!

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Created admin user:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  }

  // Create sample project for admin
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (admin) {
    const existingProject = await prisma.project.findFirst({
      where: { userId: admin.id },
    });

    if (!existingProject) {
      const project = await prisma.project.create({
        data: {
          name: 'Demo Project',
          description: 'Sample project for testing AI services',
          userId: admin.id,
          environment: 'DEVELOPMENT',
          isActive: true,
        },
      });

      console.log('✅ Created demo project:', {
        id: project.id,
        name: project.name,
      });

      // Create API key for the project
      const apiKeyValue = `proj_${project.id.substring(0, 8)}_dev_${Math.random().toString(36).substring(2, 34)}`;

      const apiKey = await prisma.apiKey.create({
        data: {
          key: apiKeyValue,
          name: 'Default API Key',
          projectId: project.id,
          scopes: ['QUERY_GENERATION', 'CHATBOT', 'ANALYTICS'],
          rateLimit: 1000,
          isActive: true,
        },
      });

      console.log('✅ Created API key:', {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKeyValue,
      });
    } else {
      console.log('✅ Demo project already exists');
    }
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Default Admin Credentials:');
  console.log('   Email:', adminEmail);
  console.log('   Password:', adminPassword);
  console.log('\n⚠️  Remember to change the admin password in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  console.log('🔐 Resetting Admin Password...\n');

  const adminEmail = 'admin@learnit.com';
  const newPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    const admin = await prisma.user.update({
      where: { email: adminEmail },
      data: { 
        passwordHash: hashedPassword,
        role: 'ADMIN'  // Ensure role is ADMIN
      },
    });

    console.log('✅ Admin password reset successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', newPassword);
    console.log('👤 Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAdminPassword()
  .finally(async () => {
    await prisma.$disconnect();
  });

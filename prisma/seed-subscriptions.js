import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding subscription tiers...');

  // Create subscription tiers
  const basic = await prisma.subscriptionTier.upsert({
    where: { name: 'BASIC' },
    update: {},
    create: {
      name: 'BASIC',
      displayName: 'Basic',
      price: 0,
      moduleLimit: 1,
      features: [
        '1 Module Access',
        'Basic Community Support',
        'Certificate on Completion',
        'Access to Core Content',
      ],
    },
  });

  const pro = await prisma.subscriptionTier.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      displayName: 'Pro',
      price: 99000,
      moduleLimit: 3,
      features: [
        '3 Modules Bundle',
        'Priority Support',
        'All Certificates',
        'Downloadable Resources',
        'Code Examples & Templates',
      ],
    },
  });

  const premium = await prisma.subscriptionTier.upsert({
    where: { name: 'PREMIUM' },
    update: {},
    create: {
      name: 'PREMIUM',
      displayName: 'Premium',
      price: 199000,
      moduleLimit: null, // Unlimited
      features: [
        'All Modules Access',
        '24/7 Premium Support',
        'All Certificates',
        'Exclusive Content',
        'Career Guidance',
        'Private Community Access',
      ],
    },
  });

  console.log('✅ Subscription tiers created:', { basic: basic.id, pro: pro.id, premium: premium.id });

  // Get all modules for creating learning paths
  const modules = await prisma.module.findMany();
  
  if (modules.length > 0) {
    console.log('🌱 Seeding learning paths...');

    // Find modules by category for paths
    const webModules = modules.filter(m => m.category === 'WEB_DEV');
    const fundamentalModules = modules.filter(m => m.category === 'FUNDAMENTAL');
    const androidModules = modules.filter(m => m.category === 'ANDROID_DEV');
    const iosModules = modules.filter(m => m.category === 'IOS_DEV');

    // Clear existing learning paths first
    await prisma.learningPath.deleteMany({});

    const pathsToCreate = [];

    // Web Development Path
    if (webModules.length > 0 || fundamentalModules.length > 0) {
      pathsToCreate.push({
        name: 'Web Development Fundamentals',
        description: 'Master web development from ground up. Start with fundamentals, learn JavaScript, and progress to modern frameworks like React and Next.js.',
        category: 'WEB_DEV',
        icon: 'language',
        modules: [
          ...fundamentalModules.map(m => m.id),
          ...webModules.map(m => m.id),
        ],
      });
    }

    // Android Development Path
    if (androidModules.length > 0 || fundamentalModules.length > 0) {
      pathsToCreate.push({
        name: 'Android Development',
        description: 'Build powerful Android applications. Start with fundamentals and progress to advanced Android development with Kotlin.',
        category: 'MOBILE_DEV',
        icon: 'android',
        modules: [
          ...fundamentalModules.map(m => m.id),
          ...androidModules.map(m => m.id),
        ],
      });
    }

    // iOS Development Path
    if (iosModules.length > 0 || fundamentalModules.length > 0) {
      pathsToCreate.push({
        name: 'iOS Development',
        description: 'Create stunning iOS applications. Learn fundamentals and master Swift for iOS development.',
        category: 'MOBILE_DEV',
        icon: 'phone_iphone',
        modules: [
          ...fundamentalModules.map(m => m.id),
          ...iosModules.map(m => m.id),
        ],
      });
    }

    // Create all paths
    for (const path of pathsToCreate) {
      await prisma.learningPath.create({ data: path });
    }

    console.log(`✅ ${pathsToCreate.length} learning paths created`);
  }

  // Auto-assign Basic tier to existing users without subscription
  const usersWithoutSub = await prisma.user.findMany({
    where: {
      subscription: null,
    },
  });

  if (usersWithoutSub.length > 0) {
    console.log(`🌱 Assigning Basic tier to ${usersWithoutSub.length} existing users...`);

    for (const user of usersWithoutSub) {
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          tierId: basic.id,
          selectedModules: [], // No modules selected yet
          status: 'ACTIVE',
        },
      });
    }

    console.log('✅ Basic tier assigned to existing users');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

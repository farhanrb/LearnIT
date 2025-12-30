import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@learnit.com',
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      profile: {
        create: {
          nickname: 'Admin',
          description: 'LearnIT Administrator',
        },
      },
    },
  });
  console.log('✅ Created admin user');

  // Create demo user
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@learnit.com',
      username: 'demo',
      passwordHash: demoPassword,
      role: 'USER',
      profile: {
        create: {
          nickname: 'Demo User',
          description: 'Just exploring LearnIT',
        },
      },
    },
  });
  console.log('✅ Created demo user');

  // Create modules
  const modules = [
    {
      title: 'Android Developer',
      slug: 'android-developer',
      description: 'Pelajari pengembangan aplikasi Android dari dasar hingga mahir. Mulai dari Java/Kotlin, Android Studio, UI/UX, hingga deployment ke Google Play Store.',
      estimatedHours: 120,
      category: 'ANDROID_DEV',
      order: 1,
    },
    {
      title: 'iOS Developer',
      slug: 'ios-developer',
      description: 'Kuasai pengembangan aplikasi iOS menggunakan Swift dan SwiftUI. Pelajari cara membuat aplikasi yang indah dan performant untuk iPhone dan iPad.',
      estimatedHours: 110,
      category: 'IOS_DEV',
      order: 2,
    },
    {
      title: 'Web Developer',
      slug: 'web-developer',
      description: 'Menjadi full-stack web developer dengan menguasai HTML, CSS, JavaScript, React, Node.js, dan database. Bangun website modern dan responsif.',
      estimatedHours: 100,
      category: 'WEB_DEV',
      order: 3,
    },
    {
      title: 'Fundamental Informatika',
      slug: 'fundamental-informatika',
      description: 'Pahami dasar-dasar ilmu komputer seperti algoritma, struktur data, basis data, jaringan komputer, dan konsep pemrograman fundamental.',
      estimatedHours: 80,
      category: 'FUNDAMENTAL',
      order: 4,
    },
  ];

  for (const moduleData of modules) {
    const module = await prisma.module.create({
      data: moduleData,
    });
    console.log(`✅ Created module: ${module.title}`);

    // Create sample lessons for each module
    const lessons = [
      {
        title: 'Pengenalan dan Persiapan',
        content: `# Pengenalan dan Persiapan

Selamat datang di modul **${moduleData.title}**!

## Apa yang Akan Dipelajari?

Dalam pelajaran ini, kita akan membahas:

1. Pengenalan konsep dasar
2. Instalasi tools yang dibutuhkan
3. Setup environment development
4. Project pertama Anda

## Prerequisites

- Komputer dengan spesifikasi minimal
- Koneksi internet stabil
- Semangat belajar yang tinggi!

Mari kita mulai perjalanan belajar Anda! 🚀`,
        order: 1,
        estimatedMinutes: 30,
      },
      {
        title: 'Konsep Dasar',
        content: `# Konsep Dasar

## Memahami Fundamental

Sebelum masuk ke praktik, penting untuk memahami konsep dasarnya terlebih dahulu.

### Topik Pembahasan:

- Teori dasar
- Best practices
- Do's and Don'ts
- Tips dari profesional

Pelajari dengan seksama setiap konsep yang dijelaskan!`,
        order: 2,
        estimatedMinutes: 45,
      },
      {
        title: 'Hands-on Practice',
        content: `# Praktik Langsung

Saatnya praktek! 💪

## Project Kecil

Mari kita buat project sederhana untuk mengaplikasikan apa yang sudah dipelajari.

### Langkah-langkah:

1. Setup project
2. Coding
3. Testing
4. Deployment

**Tips**: Jangan takut untuk mencoba dan bereksperimen!`,
        order: 3,
        estimatedMinutes: 60,
      },
      {
        title: 'Advanced Topics',
        content: `# Topik Lanjutan

## Level Up! 🎯

Sekarang kita masuk ke materi yang lebih advanced.

### Yang Akan Dipelajari:

- Teknik advanced
- Optimization
- Security best practices
- Production-ready code

Tetap semangat, Anda sudah sampai sejauh ini!`,
        order: 4,
        estimatedMinutes: 90,
      },
      {
        title: 'Final Project & Quiz',
        content: `# Final Project & Quiz

## Ujian Akhir 📝

Saatnya menguji kemampuan Anda!

### Final Project:

Buat sebuah aplikasi lengkap yang mengimplementasikan semua yang telah dipelajari.

### Quiz:

Jawab pertanyaan-pertanyaan untuk memvalidasi pemahaman Anda.

**Selamat mengerjakan!** 🎉`,
        order: 5,
        estimatedMinutes: 120,
      },
    ];

    for (const lessonData of lessons) {
      await prisma.lesson.create({
        data: {
          ...lessonData,
          moduleId: module.id,
        },
      });
    }
    console.log(`  ✅ Created ${lessons.length} lessons for ${module.title}`);
  }

  // Enroll demo user in Web Developer module
  const webModule = await prisma.module.findUnique({
    where: { slug: 'web-developer' },
  });

  if (webModule) {
    await prisma.enrollment.create({
      data: {
        userId: demoUser.id,
        moduleId: webModule.id,
      },
    });
    console.log('✅ Enrolled demo user in Web Developer module');

    // Complete first two lessons for demo
    const webLessons = await prisma.lesson.findMany({
      where: { moduleId: webModule.id },
      orderBy: { order: 'asc' },
      take: 2,
    });

    for (const lesson of webLessons) {
      await prisma.userProgress.create({
        data: {
          userId: demoUser.id,
          lessonId: lesson.id,
          completed: true,
          completedAt: new Date(),
        },
      });
    }
    console.log('✅ Marked 2 lessons as completed for demo user');
  }

  console.log('\n🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding IoT module...');

  // Create IoT module
  const iotModule = await prisma.module.create({
    data: {
      title: 'Belajar IoT',
      slug: 'belajar-iot',
      description: 'Pelajari konsep Internet of Things (IoT) dan cara membuat proyek IoT sederhana menggunakan Arduino dan ESP32.',
      category: 'FUNDAMENTAL',
      estimatedHours: 12,
      lessons: {
        create: [
          {
            title: 'Pengenalan IoT',
            content: 'Memahami konsep dasar Internet of Things, komponen IoT, dan aplikasinya di kehidupan sehari-hari.',
            order: 1,
          },
          {
            title: 'Arduino Basics',
            content: 'Belajar dasar-dasar Arduino, pin digital/analog, dan membuat LED blink pertama.',
            order: 2,
          },
          {
            title: 'Sensors dan Actuators',
            content: 'Mengenal berbagai jenis sensor (DHT11, ultrasonic, LDR) dan actuator (servo, relay, motor).',
            order: 3,
          },
          {
            title: 'ESP32 dan WiFi',
            content: 'Menggunakan ESP32 untuk koneksi WiFi, mengirim data ke cloud, dan membuat web server sederhana.',
            order: 4,
          },
          {
            title: 'Proyek Smart Home',
            content: 'Membuat proyek smart home sederhana dengan kontrol lampu via smartphone dan monitoring suhu ruangan.',
            order: 5,
          },
        ],
      },
    },
  });

  console.log('IoT module created:', iotModule);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

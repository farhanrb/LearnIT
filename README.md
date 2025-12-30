# 🎓 LearnIT - Platform Pembelajaran Informatika

<p align="center">
  <img src="apps/web/public/learnit-logo.png" alt="LearnIT Logo" width="200">
</p>

<p align="center">
  Platform pembelajaran online untuk materi informatika dengan fitur tracking progress, achievement, dan multi-tier subscription.
</p>

<p align="center">
  <a href="#-fitur">Fitur</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-instalasi">Instalasi</a> •
  <a href="#-cara-penggunaan">Cara Penggunaan</a> •
  <a href="#-struktur-project">Struktur Project</a>
</p>

---

## ✨ Fitur

### 👤 Untuk Pengguna
- 📚 **Akses Modul Pembelajaran** - Materi terstruktur dengan chapters dan lessons
- 📊 **Progress Tracking** - Pantau kemajuan belajar secara real-time
- 🏆 **Achievement System** - Dapatkan badge saat menyelesaikan milestone
- 🔔 **Notifikasi** - Pemberitahuan untuk achievement dan progress
- 🌙 **Dark Mode** - Tampilan nyaman untuk mata
- 📱 **Responsive Design** - Optimal di desktop dan mobile

### 👨‍💼 Untuk Admin
- 📈 **Dashboard Analytics** - Statistik pengguna dan pembelajaran
- 📝 **Manajemen Modul** - CRUD untuk modul, chapter, dan lesson
- 👥 **Manajemen User** - Kelola pengguna dan role
- 📊 **User Progress Overview** - Pantau progress semua pengguna

### 💳 Subscription System
- **Basic** (Gratis) - Akses 1 modul
- **Pro** - Akses 3 modul pilihan
- **Premium** - Akses unlimited semua modul

---

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework dengan App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Material Symbols** - Icon library

### Backend
- **Express.js** - Node.js web framework
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Relational database
- **JWT** - Authentication

### Monorepo
- **Turborepo** - High-performance build system

---

## 🚀 Instalasi

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm atau yarn

### Langkah Instalasi

1. **Clone repository**
```bash
git clone https://github.com/yourusername/learnit.git
cd learnit
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
# Copy template environment
cp .env.example .env

# Edit .env dengan konfigurasi Anda
# Pastikan DATABASE_URL dan JWT_SECRET sudah diisi
```

4. **Setup database**
```bash
# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev

# Seed data awal (subscription tiers, admin user, sample data)
npm run seed
```

5. **Jalankan development server**
```bash
# Jalankan API dan Web secara bersamaan
npm run dev
```

6. **Akses aplikasi**
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:3001

---

## 📖 Cara Penggunaan

### 🔐 Login Admin
1. Buka http://localhost:3000/admin-login
2. Gunakan kredensial:
   - Email: `admin@learnit.com`
   - Password: `Admin@123`

### 👤 Registrasi User Baru
1. Buka http://localhost:3000/register
2. Isi form registrasi
3. Login dengan akun yang dibuat

### 📚 Belajar
1. Login ke akun
2. Pilih menu "Kursus" untuk melihat modul tersedia
3. Enroll ke modul yang diinginkan
4. Mulai belajar dan pantau progress di Dashboard

### 🏆 Achievement
- Selesaikan lesson pertama untuk unlock "First Steps"
- Selesaikan chapter untuk unlock "Chapter Champion"
- Selesaikan modul untuk unlock "Module Master"
- Badge bisa dipilih untuk ditampilkan di profil

---

## 📁 Struktur Project

```
learnit/
├── apps/
│   ├── api/                    # Backend Express.js
│   │   ├── src/
│   │   │   ├── config/         # Database & app config
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── middleware/     # Auth, admin middleware
│   │   │   ├── routes/         # API routes
│   │   │   └── server.js       # Entry point
│   │   └── package.json
│   │
│   └── web/                    # Frontend Next.js
│       ├── app/                # Pages (App Router)
│       │   ├── (auth)/         # Login, Register
│       │   ├── admin/          # Admin pages
│       │   ├── dashboard/      # User dashboard
│       │   ├── kursus/         # Module listing
│       │   ├── modules/        # Module details & learning
│       │   └── achievements/   # Achievement page
│       ├── components/         # React components
│       │   ├── auth/           # Auth components
│       │   ├── dashboard/      # Dashboard components
│       │   ├── layout/         # Navbar, Footer
│       │   ├── modules/        # Module components
│       │   ├── shared/         # Shared/reusable components
│       │   └── ui/             # UI primitives
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities & API client
│       └── package.json
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.js                 # Main seeder
│   ├── seed-admin.js           # Admin user seeder
│   └── seed-subscriptions.js   # Subscription tiers seeder
│
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Root package.json
├── turbo.json                  # Turborepo config
└── README.md                   # This file
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Modules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/modules` | Get all modules |
| GET | `/api/modules/:id` | Get module by ID |
| POST | `/api/modules/:id/enroll` | Enroll to module |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enrolled-modules` | Get enrolled modules |
| POST | `/api/progress` | Update lesson progress |

### Admin (requires ADMIN role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Get dashboard stats |
| GET | `/api/admin/modules` | Get all modules |
| POST | `/api/admin/modules` | Create module |
| PUT | `/api/admin/modules/:id` | Update module |
| DELETE | `/api/admin/modules/:id` | Delete module |
| GET | `/api/admin/users` | Get all users |

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT signing | ✅ |
| `JWT_EXPIRES_IN` | Token expiration time | ✅ |
| `PORT` | API server port | ❌ (default: 3001) |
| `NODE_ENV` | Environment mode | ❌ (default: development) |

---

## 📝 Scripts

```bash
# Development
npm run dev           # Run all apps in development mode
npm run dev:api       # Run API only
npm run dev:web       # Run web only

# Database
npx prisma studio     # Open Prisma Studio (database GUI)
npx prisma migrate dev    # Run migrations
npx prisma generate   # Generate Prisma client

# Build
npm run build         # Build all apps
```

---

## 🤝 Contributing

1. Fork repository ini
2. Buat branch baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Farhan** - Project Owner

---

<p align="center">
  Made with ❤️ for learning
</p>

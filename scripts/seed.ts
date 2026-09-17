/**
 * Seed script: creates default admin and initializes default settings.
 * Run with: npx tsx scripts/seed.ts
 *
 * Safe to run multiple times — uses upsert logic so it won't duplicate.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@newgen-school.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to MongoDB');

  // Import models after connection
  const { default: User } = await import('../lib/db/models/User');
  const { default: Setting } = await import('../lib/db/models/Setting');
  const { DEFAULT_SETTINGS } = await import('../lib/types/index');

  // ── Seed admin user ──────────────────────────────────────────
  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) {
    console.log(`ℹ️  Admin account already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: 'admin',
      permissions: [], // admins get all permissions implicitly
      status: 'active',
    });
    console.log('');
    console.log('🎉 ─────────────────────────────────────────────');
    console.log('   Default Admin Account Created');
    console.log('   Email   :', adminEmail);
    console.log('   Password:', adminPassword);
    console.log('   ⚠️  Change this password immediately after login!');
    console.log('─────────────────────────────────────────────────');
    console.log('');
  }

  // ── Seed default settings ─────────────────────────────────────
  const settingKeys = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
  let seededCount = 0;

  for (const key of settingKeys) {
    // Only insert if not already present (don't overwrite existing admin config)
    const existing = await Setting.findOne({ key });
    if (!existing) {
      await Setting.create({ key, value: DEFAULT_SETTINGS[key] });
      seededCount++;
    }
  }

  if (seededCount > 0) {
    console.log(`✅ Seeded ${seededCount} default settings`);
  } else {
    console.log('ℹ️  All settings already exist in DB');
  }

  // ── Seed initial session and audit logs if none exist ──────────
  const { default: AuditLog } = await import('../lib/db/models/AuditLog');
  const adminUser = await User.findOne({ email: adminEmail.toLowerCase() });
  if (adminUser) {
    if (!adminUser.sessions || adminUser.sessions.length === 0) {
      adminUser.sessions = [
        {
          sessionToken: 'seed-session-' + Date.now(),
          ip: '127.0.0.1',
          userAgent: 'Chrome / Windows (Current Admin Session)',
          lastSeen: new Date(),
          createdAt: new Date(),
        },
      ];
      await adminUser.save();
      console.log('✅ Initial admin session created');
    }

    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      await AuditLog.create([
        {
          actor: adminUser._id,
          actorName: adminUser.name,
          action: 'auth.login',
          entityType: 'User',
          entityId: adminUser._id,
          metadata: { email: adminUser.email, role: adminUser.role },
          ip: '127.0.0.1',
          userAgent: 'System Seed Initializer',
        },
        {
          actor: adminUser._id,
          actorName: adminUser.name,
          action: 'setting.update',
          entityType: 'Setting',
          metadata: { note: 'Initial system configuration initialized' },
          ip: '127.0.0.1',
          userAgent: 'System Seed Initializer',
        },
      ]);
      console.log('✅ Initial audit logs created');
    }
  }

  await mongoose.disconnect();
  console.log('✅ Seed complete');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

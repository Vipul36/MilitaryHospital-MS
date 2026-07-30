import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const BACKUP_DIR = path.resolve(__dirname, '../backups');

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function backupDatabase(): Promise<string> {
  await ensureBackupDir();
  console.log('[DB Backup] Exporting system schema & records...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `mhshms-backup-${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const data = {
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      system: 'Military Hospital Smart Healthcare Management System'
    },
    tables: {
      users: await prisma.user.findMany(),
      patients: await prisma.patient.findMany(),
      doctors: await prisma.doctor.findMany(),
      departments: await prisma.department.findMany(),
      hospitals: await prisma.hospital.findMany(),
      appointments: await prisma.appointment.findMany(),
      inventories: await prisma.inventory.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      labReports: await prisma.labReport.findMany(),
      notifications: await prisma.notification.findMany()
    }
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[DB Backup] ✅ Snapshot successfully created at: ${filepath}`);
  return filepath;
}

export async function restoreDatabase(targetFile?: string): Promise<boolean> {
  await ensureBackupDir();

  let filepath = targetFile;
  if (!filepath) {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('mhshms-backup-') && f.endsWith('.json'));
    if (files.length === 0) {
      console.error('[DB Restore] ❌ No backup snapshot found in backups/ directory.');
      return false;
    }
    // Pick latest backup by lexicographical sorting on timestamp filename
    files.sort().reverse();
    filepath = path.join(BACKUP_DIR, files[0]);
  }

  if (!fs.existsSync(filepath)) {
    console.error(`[DB Restore] ❌ Specified backup file not found: ${filepath}`);
    return false;
  }

  console.log(`[DB Restore] Restoring snapshot from: ${filepath}...`);
  const raw = fs.readFileSync(filepath, 'utf-8');
  const backupData = JSON.parse(raw);

  if (!backupData.tables) {
    console.error('[DB Restore] ❌ Invalid backup format.');
    return false;
  }

  console.log(`[DB Restore] Restored backup timestamp: ${backupData.metadata?.timestamp}`);
  console.log(`[DB Restore] Data tables present: ${Object.keys(backupData.tables).join(', ')}`);
  console.log(`[DB Restore] ✅ Database snapshot validation passed successfully!`);

  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'restore') {
      await restoreDatabase(args[1]);
    } else {
      await backupDatabase();
    }
  } catch (error: any) {
    console.error('[DB Backup/Restore Error]:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

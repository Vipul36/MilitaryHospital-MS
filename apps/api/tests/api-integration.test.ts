import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/app';
import * as jwt from 'jsonwebtoken';

import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'military_hospital_secret_jwt_key_2026';
const prisma = new PrismaClient();

// Generate a valid test token
let testToken = '';

// Start a local test server
let server: http.Server;
const PORT = 5099;
const baseUrl = `http://localhost:${PORT}/api/v1`;

function request(path: string, options: http.RequestOptions = {}, body?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Authorization': `Bearer ${testToken}`,
      'Content-Type': 'application/json'
    };

    const reqOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1${path}`,
      headers: { ...defaultHeaders, ...options.headers },
      method: options.method || 'GET',
      ...options
    };

    const req = http.request(reqOptions, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode || 500,
            data: responseBody ? JSON.parse(responseBody) : null
          });
        } catch {
          resolve({ statusCode: res.statusCode || 500, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test.before(async () => {
  // Try to find the seeded admin user
  let adminId = 'test-admin-id';
  try {
    const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (adminUser) adminId = adminUser.id;
  } catch (e) {
    console.warn('[TEST SETUP] Could not query admin user, using fallback ID.', e);
  }

  testToken = jwt.sign({ id: adminId, username: 'admin', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

  return new Promise<void>((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[TEST SERVER] Running on port ${PORT}...`);
      resolve();
    });
  });
});

test.after(() => {
  return new Promise<void>((resolve) => {
    server.close(() => {
      console.log('[TEST SERVER] Closed.');
      resolve();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Dashboard Stats Integration Tests
// ─────────────────────────────────────────────────────────────────────────────
test('GET /dashboard/stats - returns operational metrics', async () => {
  const res = await request('/dashboard/stats');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.status, 'success');
  assert.ok(typeof res.data.data.waiting === 'number');
  assert.ok(typeof res.data.data.activeDocs === 'number');
  assert.ok(typeof res.data.data.lowStock === 'number');
  assert.ok(typeof res.data.data.pendingReferrals === 'number');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hospital Beds Telemetry Integration Tests
// ─────────────────────────────────────────────────────────────────────────────
test('GET /hospital/beds - returns telemetry and summaries', async () => {
  const res = await request('/hospital/beds');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.status, 'success');
  assert.ok(Array.isArray(res.data.data.telemetry));
  assert.ok(res.data.data.summary.totalBeds > 0);
});

test('PUT /hospital/beds/:id/allocate - assigns vacant bed to patient', async () => {
  // First find a vacant bed ID
  const bedsRes = await request('/hospital/beds');
  const vacantBed = bedsRes.data.data.telemetry.find((b: any) => b.status === 'VACANT');
  
  if (vacantBed) {
    const res = await request(`/hospital/beds/${vacantBed.bedId}/allocate`, {
      method: 'PUT'
    }, { patientDefenceId: 'DEF-TEST-99', patientRank: 'Major' });
    
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.strictEqual(res.data.data.status, 'OCCUPIED');
    assert.strictEqual(res.data.data.patientDefenceId, 'DEF-TEST-99');

    // Clean up: Release the bed
    await request(`/hospital/beds/${vacantBed.bedId}/release`, { method: 'PUT' });
  }
});

test('PUT /hospital/beds/:id/maintenance - toggles sanitization status', async () => {
  const bedsRes = await request('/hospital/beds');
  const vacantBed = bedsRes.data.data.telemetry.find((b: any) => b.status === 'VACANT');

  if (vacantBed) {
    // Enable maintenance
    let res = await request(`/hospital/beds/${vacantBed.bedId}/maintenance`, {
      method: 'PUT'
    }, { underMaintenance: true });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'MAINTENANCE');

    // Reset back to vacant
    res = await request(`/hospital/beds/${vacantBed.bedId}/maintenance`, {
      method: 'PUT'
    }, { underMaintenance: false });
    
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.data.status, 'VACANT');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. User Accounts Management Integration Tests
// ─────────────────────────────────────────────────────────────────────────────
test('GET /users - fetches system users list', async () => {
  const res = await request('/users');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.status, 'success');
  assert.ok(Array.isArray(res.data.data));
});

test('GET /users/summary - aggregates user counts', async () => {
  const res = await request('/users/summary');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.data.status, 'success');
  assert.ok(res.data.data.total > 0);
  assert.ok(Array.isArray(res.data.data.byStatus));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Lab Reports Diagnostics Integration Tests
// ─────────────────────────────────────────────────────────────────────────────
test('GET /lab-reports - lists lab investigations', async () => {
  const res = await request('/lab-reports');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.data.data));
});

test('GET /lab-reports/summary - displays test status breakdown', async () => {
  const res = await request('/lab-reports/summary');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.data.data.total >= 0);
  assert.ok(Array.isArray(res.data.data.byStatus));
});

test('GET /lab-reports/:id/pdf - returns PDF binary for a report', async () => {
  const listRes = await request('/lab-reports');
  const report = listRes.data.data[0];
  if (report) {
    const res = await request(`/lab-reports/${report.testId}/pdf`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(typeof res.data === 'string' && res.data.startsWith('%PDF'));
  }
});

test('GET /hospital/beds/pdf - returns PDF binary for telemetry', async () => {
  const res = await request('/hospital/beds/pdf');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(typeof res.data === 'string' && res.data.startsWith('%PDF'));
});


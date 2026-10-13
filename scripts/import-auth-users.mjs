import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env.local');
}

const csvPath = path.resolve('supabase/users.csv');
const resetExisting = process.argv.includes('--reset-existing');
const purgeExisting = process.argv.includes('--purge-existing');
const useDemoPasswords = process.argv.includes('--demo-passwords');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.POSTGRES_URL;

if (!supabaseUrl || !serviceRoleKey || !postgresUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and POSTGRES_URL are required.');
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.filter(Boolean).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function temporaryPassword() {
  return `${crypto.randomBytes(12).toString('base64url')}A9!`;
}

const demoPasswords = {
  admin: 'MediAdmin!2026',
  doctor: 'MediDoctor!2026',
  nurse: 'MediNurse!2026',
  patient: 'MediPatient!2026',
  pharmacy_reception: 'MediReception!2026',
  pharmacy_stocker: 'MediStocker!2026',
  pharmacist: 'MediPharmacist!2026',
};

function newPassword(row) {
  if (!useDemoPasswords) return temporaryPassword();
  const password = demoPasswords[row.role];
  if (!password) throw new Error(`No demo password configured for role ${row.role}`);
  return password;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(postgresUrl, { ssl: 'require' });
const rows = parseCsv(await fs.readFile(csvPath, 'utf8'));
const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;

try {
  if (purgeExisting) {
    for (const user of listedUsers.users) {
      const result = await supabase.auth.admin.deleteUser(user.id);
      if (result.error) throw result.error;
    }
    await sql`DELETE FROM users`;
  }

  for (const row of rows) {
    const email = row.email.toLowerCase();
    const existing = purgeExisting ? null : listedUsers.users.find((user) => user.email?.toLowerCase() === email);
    let authUser = existing;
    let password = null;

    if (!authUser) {
      password = newPassword(row);
      const result = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: row.name },
      });
      if (result.error || !result.data.user) throw result.error ?? new Error(`Could not create ${email}`);
      authUser = result.data.user;
      console.log(`${email}\t${password}`);
    } else if (resetExisting) {
      password = newPassword(row);
      const result = await supabase.auth.admin.updateUserById(authUser.id, { password });
      if (result.error) throw result.error;
      console.log(`${email}\t${password}`);
    } else {
      console.log(`${email}\t(existing Auth user; password unchanged)`);
    }

    const storedPassword = password
      ? await bcrypt.hash(password, 12)
      : row.password;
    await sql`
      INSERT INTO users (id, name, email, password, role, must_change_password, auth_user_id)
      VALUES (${row.id}, ${row.name}, ${email}, ${storedPassword}, ${row.role}, ${password ? true : row.must_change_password === 'true'}, ${authUser.id})
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        auth_user_id = EXCLUDED.auth_user_id,
        password = CASE WHEN ${password !== null} THEN EXCLUDED.password ELSE users.password END,
        must_change_password = CASE WHEN ${password !== null} THEN TRUE ELSE users.must_change_password END
    `;
  }
} finally {
  await sql.end({ timeout: 5 });
}

console.log('\nNew passwords are temporary and must be changed after first login.');

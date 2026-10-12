import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users, patientAppointments, walletTransactions, consultationTypes, doctors, doctorAvailability, supportChannels } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'patient'
    );
  `;
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient';
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password, role)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword}, ${user.role})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedAppointments() {
  await sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      patient_email TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      appointment_date DATE NOT NULL,
      appointment_time TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
    );
  `;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id TEXT`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_id TEXT`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS fee_cents INT NOT NULL DEFAULT 0`;

  const insertedAppointments = await Promise.all(
    patientAppointments.map(
      (appointment) => sql`
        INSERT INTO appointments (patient_email, doctor_name, specialty, appointment_date, appointment_time, reason, status)
        VALUES (${appointment.patient_email}, ${appointment.doctor_name}, ${appointment.specialty}, ${appointment.appointment_date}, ${appointment.appointment_time}, ${appointment.reason}, ${appointment.status})
        ON CONFLICT DO NOTHING;
      `,
    ),
  );

  return insertedAppointments;
}

async function seedBookingCatalog() {
  await sql`
    CREATE TABLE IF NOT EXISTS consultation_types (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      examples TEXT NOT NULL,
      duration_minutes INT NOT NULL,
      fee_cents INT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      category TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS doctor_availability (
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      appointment_time TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY (doctor_id, day_of_week, appointment_time)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS support_channels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      type TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      patient_email TEXT NOT NULL,
      wallet_transaction_id UUID NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  await Promise.all(consultationTypes.map((type) => sql`
    INSERT INTO consultation_types (id, label, examples, duration_minutes, fee_cents)
    VALUES (${type.id}, ${type.label}, ${type.examples}, ${type.duration_minutes}, ${type.fee_cents})
    ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, examples = EXCLUDED.examples,
      duration_minutes = EXCLUDED.duration_minutes, fee_cents = EXCLUDED.fee_cents
  `));
  await Promise.all(doctors.map((doctor) => sql`
    INSERT INTO doctors (id, name, specialty, category)
    VALUES (${doctor.id}, ${doctor.name}, ${doctor.specialty}, ${doctor.category})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, specialty = EXCLUDED.specialty,
      category = EXCLUDED.category
  `));
  await Promise.all(doctorAvailability.map((slot) => sql`
    INSERT INTO doctor_availability (doctor_id, day_of_week, appointment_time)
    VALUES (${slot.doctor_id}, ${slot.day_of_week}, ${slot.appointment_time})
    ON CONFLICT DO NOTHING
  `));
  await Promise.all(supportChannels.map((channel) => sql`
    INSERT INTO support_channels (id, title, detail, type)
    VALUES (${channel.id}, ${channel.title}, ${channel.detail}, ${channel.type})
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, detail = EXCLUDED.detail, type = EXCLUDED.type
  `));
}

async function seedWalletTransactions() {
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      patient_email TEXT NOT NULL,
      amount INT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `;

  const insertedTransactions = await Promise.all(
    walletTransactions.map(
      (transaction) => sql`
        INSERT INTO wallet_transactions (patient_email, amount, status, description)
        VALUES (${transaction.patient_email}, ${transaction.amount}, ${transaction.status}, ${transaction.description})
        ON CONFLICT DO NOTHING;
      `,
    ),
  );

  return insertedTransactions;
}

async function seedInvoices() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  return insertedRevenue;
}

export async function GET() {
  try {
    await seedUsers();
    await seedCustomers();
    await seedAppointments();
    await seedBookingCatalog();
    await seedWalletTransactions();
    await seedInvoices();
    await seedRevenue();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}

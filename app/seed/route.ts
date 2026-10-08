import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users, patientAppointments, walletTransactions } from '../lib/placeholder-data';

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
    await seedWalletTransactions();
    await seedInvoices();
    await seedRevenue();

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}

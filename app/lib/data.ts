import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function fetchRevenue() {
  try {
    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
      return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, invoices.status, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].count ?? '0');
    const numberOfCustomers = Number(data[1].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchPatientDashboardData(email: string) {
  try {
    const [patient] = await sql`
      SELECT id, name, email, date_of_birth, patient_number
      FROM users
      WHERE email = ${email} AND role = 'patient'
      LIMIT 1
    `;

    const [appointments, consultationTypes, doctors, availability, supportChannels] = await Promise.all([
      sql`
      SELECT id, doctor_id, doctor_name, specialty, appointment_date, appointment_time, reason, status, fee_cents
      FROM appointments
      WHERE patient_email = ${email}
      ORDER BY appointment_date ASC, appointment_time ASC
      LIMIT 5
      `,
      sql`SELECT id, label, examples, duration_minutes, fee_cents FROM consultation_types WHERE active = TRUE ORDER BY label`,
      sql`SELECT id, name, specialty, category FROM doctors WHERE active = TRUE ORDER BY category, name`,
      sql`SELECT doctor_id, day_of_week, appointment_time FROM doctor_availability WHERE active = TRUE ORDER BY day_of_week, appointment_time`,
      sql`SELECT id, title, detail, type FROM support_channels WHERE active = TRUE ORDER BY id`,
    ]);

    const transactions = await sql`
      SELECT id, amount, status, description
      FROM wallet_transactions
      WHERE patient_email = ${email}
      ORDER BY id DESC
      LIMIT 10
    `;

    const [wallet] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'outgoing' THEN amount ELSE 0 END), 0) AS outgoing,
        COALESCE(SUM(amount), 0) AS total
      FROM wallet_transactions
      WHERE patient_email = ${email}
    `;

    const [unreadNotifications, medicalRecordCount] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM notifications WHERE user_email = ${email} AND user_type = 'patient' AND read = FALSE`,
      sql`SELECT COUNT(*)::int AS count FROM medical_records WHERE patient_email = ${email}`,
    ]);

    const invoices = await sql`
      SELECT invoices.id, invoices.amount, invoices.status, invoices.date
      FROM invoices
      JOIN customers ON customers.id = invoices.customer_id
      WHERE customers.email = ${email}
      ORDER BY invoices.date DESC
      LIMIT 5
    `;

    const money = (value: unknown) => `$${(Number(value ?? 0) / 100).toFixed(2)}`;
    const formattedAppointments = appointments.map((appointment) => ({
      id: String(appointment.id),
      doctorId: appointment.doctor_id ? String(appointment.doctor_id) : null,
      doctor: appointment.doctor_name,
      specialty: appointment.specialty,
      date: String(appointment.appointment_date),
      time: appointment.appointment_time,
      reason: appointment.reason,
      status: appointment.status,
      amount: Number(appointment.fee_cents ?? 0),
    }));

    return {
      patient: patient ?? { name: 'Patient', email },
      careHighlights: [
        { label: 'Medical records', value: String(medicalRecordCount[0]?.count ?? 0) },
        { label: 'Booked visits', value: String(formattedAppointments.length) },
        { label: 'Notifications', value: String(unreadNotifications[0]?.count ?? 0) },
        { label: 'Care plan', value: medicalRecordCount[0]?.count ? 'Available' : 'Pending' },
      ],
      upcomingAppointments: formattedAppointments,
      walletSummary: [
        { label: 'Wallet Balance', value: money(wallet?.total), tone: 'emerald' },
        { label: 'Paid This Month', value: money(wallet?.paid), tone: 'blue' },
        { label: 'Pending', value: money(wallet?.pending), tone: 'amber' },
        { label: 'Outgoing', value: money(wallet?.outgoing), tone: 'slate' },
      ],
      walletTransactions: transactions.map((transaction) => ({
        id: String(transaction.id),
        amount: money(transaction.amount),
        status: transaction.status,
        description: transaction.description,
        date: 'Recent',
      })),
      invoices: invoices.map((invoice) => ({
        id: String(invoice.id),
        amount: money(invoice.amount),
        status: invoice.status,
        createdDate: String(invoice.date),
      })),
      unreadNotifications: Number(unreadNotifications[0]?.count ?? 0),
      bookingOptions: {
        consultationTypes: consultationTypes.map((type) => ({
          id: type.id,
          label: type.label,
          examples: type.examples,
          durationMinutes: Number(type.duration_minutes),
          feeCents: Number(type.fee_cents),
        })),
        doctors: doctors.map((doctor) => ({
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          category: doctor.category,
        })),
        availability: availability.map((slot) => ({
          doctorId: slot.doctor_id,
          dayOfWeek: Number(slot.day_of_week),
          time: slot.appointment_time,
        })),
      },
      supportChannels: supportChannels.map((channel) => ({
        id: channel.id,
        title: channel.title,
        detail: channel.detail,
        type: channel.type,
      })),
    };
  } catch (error) {
    console.error('Patient dashboard data unavailable.', error);
    return {
      patient: { name: 'Patient', email },
      careHighlights: [{ label: 'Active prescriptions', value: '0' }],
      upcomingAppointments: [],
      walletSummary: [
        { label: 'Wallet Balance', value: '$0.00', tone: 'emerald' },
        { label: 'Paid This Month', value: '$0.00', tone: 'blue' },
        { label: 'Pending', value: '$0.00', tone: 'amber' },
        { label: 'Outgoing', value: '$0.00', tone: 'slate' },
      ],
      walletTransactions: [],
      invoices: [],
      unreadNotifications: 0,
      bookingOptions: { consultationTypes: [], doctors: [], availability: [] },
      supportChannels: [],
    };
  }
}

export async function fetchPatientProfile(email: string) {
  const [profile] = await sql`
    SELECT id, name, email, date_of_birth, phone, national_id, patient_number, pharmacy_preference, avatar_url
    FROM users WHERE email = ${email} AND role = 'patient' LIMIT 1
  `;
  return profile ?? { email, name: 'Patient' };
}

export async function fetchPatientNotifications(email: string) {
  return sql`
    SELECT id, type, message, read, created_at
    FROM notifications
    WHERE user_email = ${email} AND user_type = 'patient'
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

export async function fetchPatientMedicalRecords(email: string) {
  return sql`
    SELECT id, record_type, title, summary, status, recorded_at
    FROM medical_records
    WHERE patient_email = ${email}
    ORDER BY recorded_at DESC
    LIMIT 50
  `;
}

export async function fetchStaffQueue() {
  return sql`
    SELECT id, patient_email, doctor_name, specialty, appointment_date, appointment_time, reason, status
    FROM appointments
    WHERE appointment_date >= CURRENT_DATE AND status NOT IN ('Cancelled', 'Completed')
    ORDER BY appointment_date, appointment_time
    LIMIT 100
  `;
}

export async function fetchStaffCalendar() {
  return sql`
    SELECT doctors.name, doctors.specialty, doctor_availability.day_of_week, doctor_availability.appointment_time
    FROM doctors
    JOIN doctor_availability ON doctor_availability.doctor_id = doctors.id
    WHERE doctors.active = TRUE AND doctor_availability.active = TRUE
    ORDER BY doctors.name, doctor_availability.day_of_week, doctor_availability.appointment_time
    LIMIT 500
  `;
}

export async function probePatientDashboardData(emailPresent: boolean) {
  const result: {
    invoiceColumns: string[];
    customerColumns: string[];
    userColumns: string[];
    invoicesAmount?: string;
    usersAmount?: string;
    customersAmount?: string;
    unqualifiedJoin?: string;
    unqualifiedPosition?: string;
  } = {
    invoiceColumns: [],
    customerColumns: [],
    userColumns: [],
  };

  try {
    const cols = await sql`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('invoices', 'customers', 'users')
      ORDER BY table_name, ordinal_position
    `;
    result.invoiceColumns = cols
      .filter((col) => col.table_name === 'invoices')
      .map((col) => col.column_name);
    result.customerColumns = cols
      .filter((col) => col.table_name === 'customers')
      .map((col) => col.column_name);
    result.userColumns = cols
      .filter((col) => col.table_name === 'users')
      .map((col) => col.column_name);
  } catch (error) {
    const err = error as { message?: string; code?: string };
  }

  const tryQuery = async (
    hypothesisId: string,
    label: string,
    query: () => Promise<unknown>,
  ) => {
    try {
      await query();
      return 'ok';
    } catch (error) {
      const err = error as { message?: string; code?: string; position?: string };
      return `${err.code}:${err.message}:pos=${err.position}`;
    }
  };

  result.invoicesAmount = await tryQuery(
    'A',
    'invoices.amount',
    () => sql`SELECT invoices.amount FROM invoices LIMIT 1`,
  );
  result.usersAmount = await tryQuery(
    'B',
    'users.amount',
    () => sql`SELECT amount FROM users LIMIT 1`,
  );
  result.customersAmount = await tryQuery(
    'B',
    'customers.amount',
    () => sql`SELECT amount FROM customers LIMIT 1`,
  );
  result.unqualifiedJoin = await tryQuery(
    'C',
    'unqualified amount users-customers join',
    () => sql`
      SELECT users.name, users.email, customers.name, amount
      FROM users
      JOIN customers ON customers.email = users.email
      LIMIT 1
    `,
  );

  return result;
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

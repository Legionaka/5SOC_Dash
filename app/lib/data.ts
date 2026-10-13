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
import { ensurePharmacyInventorySchema } from './pharmacy-schema';

const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
  connect_timeout: 8,
  connection: { statement_timeout: 10000 },
});

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
      SELECT id, name, email, date_of_birth, patient_number, phone, emergency_contact, preferred_contact_method, data_sharing_consent
      FROM users
      WHERE email = ${email} AND role = 'patient'
      LIMIT 1
    `;

    const [appointments, consultationTypes, doctors, availability, supportChannels] = await Promise.all([
      sql`
      SELECT id, doctor_id, doctor_name, specialty, appointment_date, appointment_time, reason, status, fee_cents
      FROM appointments
      WHERE patient_email = ${email} AND appointment_date >= CURRENT_DATE AND status NOT IN ('Cancelled', 'Completed', 'Rejected')
      ORDER BY appointment_date ASC, appointment_time ASC
      LIMIT 10
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

    const appointmentHistory = await sql`
      SELECT id, doctor_name, specialty, appointment_date, appointment_time, status
      FROM appointments WHERE patient_email = ${email} AND (appointment_date < CURRENT_DATE OR status IN ('Completed', 'Cancelled'))
      ORDER BY appointment_date DESC, appointment_time DESC LIMIT 10
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

    const [unreadNotifications, medicalRecords, medicalRecordCount] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM notifications WHERE user_email = ${email} AND user_type = 'patient' AND read = FALSE`,
      sql`SELECT id, record_type, title, summary, status, recorded_at FROM medical_records WHERE patient_email = ${email} ORDER BY recorded_at DESC LIMIT 20`,
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

    const money = (value: unknown) => formatCurrency(Number(value ?? 0));
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
      patient: patient ?? { name: 'Patient', email, phone: null, emergency_contact: null, preferred_contact_method: 'email', data_sharing_consent: false },
      careHighlights: [
        { label: 'Medical records', value: String(medicalRecordCount[0]?.count ?? 0), detail: 'Clinical documents shared by your care team.' },
        { label: 'Booked visits', value: String(formattedAppointments.length), detail: 'Upcoming and recently scheduled appointments.' },
        { label: 'Notifications', value: String(unreadNotifications[0]?.count ?? 0), detail: 'Unread updates from your clinic.' },
        { label: 'Care plan', value: medicalRecords.some((record) => /care plan/i.test(record.record_type) || /care plan/i.test(record.title)) ? 'Available' : 'Not available', detail: 'A clinician shares a care plan when one is needed.' },
      ],
      medicalRecords: medicalRecords.map((record) => ({ id: String(record.id), type: record.record_type, title: record.title, summary: record.summary, status: record.status, date: String(record.recorded_at) })),
      recordsUpdatedAt: medicalRecords[0]?.recorded_at ? String(medicalRecords[0].recorded_at) : null,
      upcomingAppointments: formattedAppointments,
      appointmentHistory: appointmentHistory.map((item) => ({ id: String(item.id), doctor: item.doctor_name, specialty: item.specialty, date: String(item.appointment_date), time: item.appointment_time, status: item.status })),
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
      patient: { name: 'Patient', email, phone: null, emergency_contact: null, preferred_contact_method: 'email', data_sharing_consent: false },
      careHighlights: [],
      medicalRecords: [],
      recordsUpdatedAt: null,
      upcomingAppointments: [],
      appointmentHistory: [],
      walletSummary: [
        { label: 'Wallet Balance', value: formatCurrency(0), tone: 'emerald' },
        { label: 'Paid This Month', value: formatCurrency(0), tone: 'blue' },
        { label: 'Pending', value: formatCurrency(0), tone: 'amber' },
        { label: 'Outgoing', value: formatCurrency(0), tone: 'slate' },
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
  try {
    const [profile] = await sql`
      SELECT id, name, email, date_of_birth, phone, national_id, patient_number, pharmacy_preference, avatar_url, emergency_contact, preferred_contact_method, data_sharing_consent
      FROM users WHERE email = ${email} AND role = 'patient' LIMIT 1
    `;
    return profile ?? { email, name: 'Patient' };
  } catch (error) {
    console.error('Patient profile data unavailable:', error);
    return { email, name: 'Patient' };
  }
}

export async function fetchPatientRequests(email: string) {
  try {
    return await sql`
      SELECT id, request_type, message, status, response, created_at, responded_at
      FROM patient_requests WHERE patient_email = ${email}
      ORDER BY created_at DESC LIMIT 20
    `;
  } catch (error) {
    console.error('Patient request history unavailable:', error);
    return [];
  }
}

export async function fetchOpenPatientRequests() {
  try {
    return await sql`
      SELECT r.id, r.patient_email, u.name AS patient_name, r.request_type,
        r.message, r.status, r.response, r.created_at
      FROM patient_requests r
      LEFT JOIN users u ON u.email = r.patient_email
      WHERE r.status = 'Open'
      ORDER BY r.created_at ASC LIMIT 100
    `;
  } catch (error) {
    console.error('Staff patient request queue unavailable:', error);
    return [];
  }
}

export async function fetchPatientMedicationReminders(email: string) {
  try {
    return await sql`
      SELECT id, medication_name, reminder_time, instructions
      FROM patient_medication_reminders
      WHERE patient_email = ${email} AND active = TRUE
      ORDER BY reminder_time ASC LIMIT 50
    `;
  } catch (error) {
    console.error('Patient medication reminders unavailable:', error);
    return [];
  }
}

export async function fetchPatientNotifications(email: string) {
  try {
    return await sql`
      SELECT id, type, message, read, created_at
      FROM notifications
      WHERE user_email = ${email} AND user_type = 'patient'
      ORDER BY created_at DESC
      LIMIT 50
    `;
  } catch (error) {
    console.error('Patient notifications unavailable:', error);
    return [];
  }
}

export async function fetchPatientMedicalRecords(email: string) {
  try {
    return await sql`
      SELECT id, record_type, title, summary, status, recorded_at
      FROM medical_records
      WHERE patient_email = ${email}
      ORDER BY recorded_at DESC
      LIMIT 50
    `;
  } catch (error) {
    console.error('Patient medical records unavailable:', error);
    return [];
  }
}

export async function fetchStaffQueue() {
  return sql`
    SELECT a.id, a.patient_email, COALESCE(u.name, a.patient_email) AS patient_name,
      a.doctor_name, a.specialty, a.appointment_date, a.appointment_time,
      a.reason, a.status, a.check_in_status
    FROM appointments a LEFT JOIN users u ON u.email = a.patient_email
    WHERE a.appointment_date >= CURRENT_DATE AND a.status NOT IN ('Cancelled', 'Rejected', 'Completed')
    ORDER BY a.appointment_date, a.appointment_time
    LIMIT 100
  `;
}

export async function fetchNurseQueue() {
  return sql`
    SELECT a.id, a.patient_email, COALESCE(u.name, a.patient_email) AS patient_name,
      a.doctor_name, a.specialty, a.appointment_date, a.appointment_time,
      a.reason, a.status, a.check_in_status,
      t.blood_pressure, t.pulse, t.temperature_c, t.weight_kg, t.height_cm,
      t.initial_complaint, t.status AS triage_status, t.nurse_email, t.updated_at AS triage_updated_at
    FROM appointments a
    LEFT JOIN users u ON u.email = a.patient_email
    LEFT JOIN patient_triage t ON t.appointment_id = a.id
    WHERE a.appointment_date = CURRENT_DATE AND a.status NOT IN ('Cancelled', 'Rejected', 'Completed')
    ORDER BY CASE WHEN a.check_in_status = 'In consultation' THEN 1 ELSE 0 END, a.appointment_time
    LIMIT 100
  `;
}

export async function fetchAdminStaffAccounts() {
  return sql`
    SELECT id, name, email, role, must_change_password, active
    FROM users
    WHERE role IN ('doctor', 'nurse', 'pharmacist', 'pharmacy_reception', 'pharmacy_stocker')
    ORDER BY role, name LIMIT 300
  `;
}

export async function fetchDoctorStaffOptions() {
  return sql`SELECT name, email FROM users WHERE role = 'doctor' ORDER BY name LIMIT 200`;
}

export async function fetchDoctorCatalogOptions() {
  return sql`SELECT id, name, specialty FROM doctors WHERE active = TRUE ORDER BY name LIMIT 200`;
}

export async function fetchAdminDashboardData() {
  const [[appointments], [checkedIn], [waiting], [openTasks], [pendingInvoices], [staff], [doctors], [nurses]] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM appointments WHERE appointment_date = CURRENT_DATE AND status NOT IN ('Cancelled', 'Rejected')`,
    sql`SELECT COUNT(*)::int AS count FROM appointments WHERE appointment_date = CURRENT_DATE AND check_in_status IN ('Checked in', 'In consultation') AND status NOT IN ('Cancelled', 'Rejected', 'Completed')`,
    sql`SELECT COUNT(*)::int AS count FROM appointments WHERE appointment_date = CURRENT_DATE AND check_in_status = 'Not checked in' AND status NOT IN ('Cancelled', 'Rejected', 'Completed')`,
    sql`SELECT COUNT(*)::int AS count FROM patient_requests WHERE status = 'Open'`,
    sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::bigint AS cents FROM invoices WHERE status = 'pending'`,
    sql`SELECT COUNT(*)::int AS count FROM users WHERE role IN ('doctor', 'nurse', 'pharmacist', 'pharmacy_reception', 'pharmacy_stocker')`,
    sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'doctor'`,
    sql`SELECT COUNT(*)::int AS count FROM users WHERE role = 'nurse'`,
  ]);
  return {
    appointments: Number(appointments?.count ?? 0), checkedIn: Number(checkedIn?.count ?? 0),
    waiting: Number(waiting?.count ?? 0), openTasks: Number(openTasks?.count ?? 0),
    pendingInvoices: Number(pendingInvoices?.count ?? 0), pendingInvoiceCents: Number(pendingInvoices?.cents ?? 0),
    staff: Number(staff?.count ?? 0), doctors: Number(doctors?.count ?? 0), nurses: Number(nurses?.count ?? 0),
  };
}

export async function fetchAdminOperationsReport() {
  const [payments, [upcoming], recentActivity, byStatus] = await Promise.all([
    sql<{ status: string; count: number; cents: number }[]>`SELECT status, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::bigint AS cents FROM invoices GROUP BY status ORDER BY status`,
    sql`SELECT COUNT(*)::int AS count FROM appointments WHERE appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 6 AND status NOT IN ('Cancelled', 'Rejected')`,
    sql<{ actor_email: string; actor_role: string; action: string; entity_type: string; created_at: Date }[]>`SELECT actor_email, actor_role, action, entity_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8`,
    sql<{ status: string; count: number }[]>`SELECT status, COUNT(*)::int AS count FROM appointments WHERE appointment_date = CURRENT_DATE GROUP BY status ORDER BY status`,
  ]);
  return { payments, upcoming: Number(upcoming?.count ?? 0), recentActivity, appointmentStatuses: byStatus };
}

export async function fetchNursePatientRequests() {
  return sql`
    SELECT id, patient_email, COALESCE(u.name, patient_email) AS patient_name,
      request_type, message, created_at
    FROM patient_requests r LEFT JOIN users u ON u.email = r.patient_email
    WHERE r.status = 'Open' AND r.request_type IN ('question', 'appointment_change')
    ORDER BY r.created_at ASC LIMIT 100
  `;
}

export async function fetchPharmacyInventory() {
  await ensurePharmacyInventorySchema();
  return sql`
    SELECT id, medicine_name, strength, batch_number, quantity, reorder_level, expires_on, updated_at,
      (quantity <= reorder_level) AS low_stock,
      (expires_on IS NOT NULL AND expires_on < CURRENT_DATE) AS expired,
      (expires_on IS NOT NULL AND expires_on BETWEEN CURRENT_DATE AND CURRENT_DATE + 90) AS expiring_soon
    FROM pharmacy_inventory
    ORDER BY (quantity <= reorder_level) DESC, expires_on ASC NULLS LAST, medicine_name
    LIMIT 500
  `;
}

export async function fetchPharmacyInventoryHistory() {
  await ensurePharmacyInventorySchema();
  return sql`
    SELECT t.id, t.actor_email, t.quantity_change, t.reason, t.created_at,
      i.medicine_name, i.strength, i.batch_number
    FROM pharmacy_inventory_transactions t
    JOIN pharmacy_inventory i ON i.id = t.item_id
    ORDER BY t.created_at DESC LIMIT 30
  `;
}

export async function fetchReceptionInvoices() {
  return sql`
    SELECT i.id, i.amount, i.status, i.date, c.name AS patient_name, c.email AS patient_email
    FROM invoices i JOIN customers c ON c.id = i.customer_id
    WHERE i.status = 'pending'
    ORDER BY i.date ASC LIMIT 200
  `;
}

export async function fetchStaffCalendar() {
  return sql`
    SELECT doctors.id AS doctor_id, doctors.name, doctors.specialty, doctor_availability.day_of_week, doctor_availability.appointment_time
    FROM doctors
    JOIN doctor_availability ON doctor_availability.doctor_id = doctors.id
    WHERE doctors.active = TRUE AND doctor_availability.active = TRUE
    ORDER BY doctors.name, doctor_availability.day_of_week, doctor_availability.appointment_time
    LIMIT 500
  `;
}

export async function fetchDoctorDashboardData(email: string, name: string, isAdmin: boolean) {
  const appointments = await sql`
    SELECT a.id, a.patient_email, COALESCE(u.name, a.patient_email) AS patient_name,
      a.doctor_name, a.specialty, a.appointment_date, a.appointment_time, a.reason,
      a.status, a.check_in_status
    FROM appointments a
    LEFT JOIN users u ON u.email = a.patient_email
    WHERE a.appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND a.status NOT IN ('Cancelled', 'Rejected', 'Completed')
      ${isAdmin ? sql`` : sql`AND a.doctor_name = ${name}`}
    ORDER BY a.appointment_date, a.appointment_time LIMIT 100
  `;
  const [pendingResults] = await sql`
    SELECT COUNT(*)::int AS count FROM diagnostic_results
    WHERE status = 'Pending' AND (${isAdmin} OR doctor_email = ${email})
  `;
  const [criticalResults] = await sql`
    SELECT COUNT(*)::int AS count FROM diagnostic_results
    WHERE priority = 'critical' AND status = 'Pending' AND (${isAdmin} OR doctor_email = ${email})
  `;
  const [openTasks] = await sql`
    SELECT COUNT(*)::int AS count FROM patient_requests
    WHERE status = 'Open' AND request_type IN ('prescription_refill', 'appointment_change', 'question')
  `;
  const [patients] = await sql`
    SELECT COUNT(DISTINCT patient_email)::int AS count FROM appointments
    WHERE (${isAdmin} OR doctor_name = ${name})
  `;
  const activeBlocks = await sql`
    SELECT id, block_date, start_time, end_time, reason
    FROM doctor_schedule_blocks
    WHERE active = TRUE AND block_date >= CURRENT_DATE AND (${isAdmin} OR doctor_email = ${email})
    ORDER BY block_date, start_time LIMIT 10
  `;
  return {
    appointments: appointments.map((item) => ({
      id: String(item.id), patientEmail: String(item.patient_email), patientName: String(item.patient_name),
      doctor: String(item.doctor_name), specialty: String(item.specialty), date: String(item.appointment_date),
      time: String(item.appointment_time), reason: String(item.reason), status: String(item.status),
      checkInStatus: String(item.check_in_status ?? 'Not checked in'),
    })),
    pendingResults: Number(pendingResults?.count ?? 0),
    criticalResults: Number(criticalResults?.count ?? 0),
    openTasks: Number(openTasks?.count ?? 0),
    patientCount: Number(patients?.count ?? 0),
    blocks: activeBlocks.map((item) => ({ id: String(item.id), date: String(item.block_date), start: String(item.start_time), end: String(item.end_time), reason: String(item.reason) })),
  };
}

export async function fetchDoctorPatients(doctorName: string, isAdmin: boolean) {
  return sql`
    SELECT u.email, u.name, u.date_of_birth, u.patient_number,
      MAX(a.appointment_date) AS last_visit, COUNT(a.id)::int AS visit_count
    FROM appointments a
    JOIN users u ON u.email = a.patient_email AND u.role = 'patient'
    WHERE (${isAdmin} OR a.doctor_name = ${doctorName})
    GROUP BY u.email, u.name, u.date_of_birth, u.patient_number
    ORDER BY MAX(a.appointment_date) DESC NULLS LAST LIMIT 200
  `;
}

export async function fetchDoctorActionAppointments(doctorName: string, isAdmin: boolean) {
  return sql`
    SELECT a.id, a.patient_email, COALESCE(u.name, a.patient_email) AS patient_name,
      a.appointment_date, a.reason
    FROM appointments a LEFT JOIN users u ON u.email = a.patient_email
    WHERE a.appointment_date <= CURRENT_DATE + INTERVAL '7 days'
      AND a.status NOT IN ('Cancelled', 'Rejected')
      AND (${isAdmin} OR a.doctor_name = ${doctorName})
    ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 100
  `;
}

export async function fetchDoctorPatientChart(email: string) {
  const [patient] = await sql`SELECT email, name, date_of_birth, phone, patient_number FROM users WHERE email = ${email} AND role = 'patient' LIMIT 1`;
  if (!patient) return null;
  const [appointments, items, results, notes, medicalRecords, prescriptions, referrals] = await Promise.all([
    sql`SELECT a.id, a.doctor_name, a.specialty, a.appointment_date, a.appointment_time, a.reason, a.status, a.check_in_status,
      t.blood_pressure, t.pulse, t.temperature_c, t.weight_kg, t.height_cm, t.initial_complaint, t.status AS triage_status
      FROM appointments a LEFT JOIN patient_triage t ON t.appointment_id = a.id
      WHERE a.patient_email = ${email} ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT 30`,
    sql`SELECT id, item_type, item_name, details, status, created_at FROM patient_clinical_items WHERE patient_email = ${email} AND archived_at IS NULL ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT id, test_name, result_summary, source_system, priority, status, released_at, created_at, reviewed_at FROM diagnostic_results WHERE patient_email = ${email} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT id, appointment_id, doctor_email, title, content, status, addendum_to, created_at, signed_at FROM clinical_notes WHERE patient_email = ${email} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT id, record_type, title, summary, status, recorded_at FROM medical_records WHERE patient_email = ${email} ORDER BY recorded_at DESC LIMIT 50`,
    sql`SELECT id, medication_name, strength, directions, quantity, refills, pharmacy, status, pharmacist_note, created_at FROM prescriptions WHERE patient_email = ${email} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT id, specialty, destination, reason, urgency, status, created_at FROM clinical_referrals WHERE patient_email = ${email} AND archived_at IS NULL ORDER BY created_at DESC LIMIT 100`,
  ]);
  return { patient, appointments, items, results, notes, medicalRecords, prescriptions, referrals };
}

export async function fetchDoctorDiagnosticResults(email: string, isAdmin: boolean) {
  return sql`
    SELECT r.id, r.patient_email, COALESCE(u.name, r.patient_email) AS patient_name,
      r.appointment_id, r.doctor_email, r.test_name, r.result_summary, r.source_system,
      r.priority, r.status, r.released_at, r.created_at, r.reviewed_at
    FROM diagnostic_results r
    LEFT JOIN users u ON u.email = r.patient_email
    WHERE (${isAdmin} OR r.doctor_email = ${email} OR (r.doctor_email = 'lab-integration' AND r.status = 'Pending'))
    ORDER BY CASE WHEN r.priority = 'critical' AND r.status = 'Pending' THEN 0 WHEN r.status = 'Pending' THEN 1 ELSE 2 END, r.created_at DESC
    LIMIT 200
  `;
}

export async function fetchDoctorClinicalNotes(email: string, isAdmin: boolean) {
  return sql`
    SELECT n.id, n.patient_email, COALESCE(u.name, n.patient_email) AS patient_name,
      n.appointment_id, n.doctor_email, n.title, n.content, n.status, n.addendum_to, n.created_at, n.signed_at
    FROM clinical_notes n LEFT JOIN users u ON u.email = n.patient_email
    WHERE (${isAdmin} OR n.doctor_email = ${email})
    ORDER BY n.created_at DESC LIMIT 100
  `;
}

export async function fetchDoctorScheduleBlocks(email: string, isAdmin: boolean) {
  return sql`
    SELECT id, doctor_name, block_date, start_time, end_time, reason
    FROM doctor_schedule_blocks
    WHERE active = TRUE AND block_date >= CURRENT_DATE AND (${isAdmin} OR doctor_email = ${email})
    ORDER BY block_date, start_time LIMIT 100
  `;
}

export async function fetchDoctorPrescriptions(email: string, isAdmin: boolean) {
  return sql`
    SELECT p.id, p.patient_email, COALESCE(u.name, p.patient_email) AS patient_name,
      p.appointment_id, p.doctor_email, p.medication_name, p.strength, p.directions,
      p.quantity, p.refills, p.pharmacy, p.status, p.pharmacist_note, p.created_at,
      p.verified_at, p.dispensed_at
    FROM prescriptions p LEFT JOIN users u ON u.email = p.patient_email
    WHERE (${isAdmin} OR p.doctor_email = ${email})
    ORDER BY CASE WHEN p.status = 'Pending verification' THEN 0 ELSE 1 END, p.created_at DESC LIMIT 200
  `;
}

export async function fetchPharmacyPrescriptions() {
  await ensurePharmacyInventorySchema();
  return sql`
    SELECT p.id, p.patient_email, COALESCE(u.name, p.patient_email) AS patient_name,
      p.medication_name, p.strength, p.directions, p.quantity, p.refills, p.pharmacy,
      p.status, p.pharmacist_note, p.created_at,
      COALESCE((SELECT string_agg(item_name || CASE WHEN details <> '' THEN ': ' || details ELSE '' END, '; ')
        FROM patient_clinical_items WHERE patient_email = p.patient_email AND item_type = 'allergy' AND status = 'Active'), '') AS active_allergies,
      COALESCE((SELECT string_agg(item_name || CASE WHEN details <> '' THEN ': ' || details ELSE '' END, '; ')
        FROM patient_clinical_items WHERE patient_email = p.patient_email AND item_type = 'medication' AND status = 'Active'), '') AS active_medications,
      COALESCE((SELECT SUM(i.quantity)::int FROM pharmacy_inventory i
        WHERE lower(i.medicine_name) = lower(p.medication_name) AND lower(i.strength) = lower(p.strength)
          AND i.quantity > 0 AND (i.expires_on IS NULL OR i.expires_on >= CURRENT_DATE)), 0)::int AS inventory_on_hand
    FROM prescriptions p LEFT JOIN users u ON u.email = p.patient_email
    WHERE p.status NOT IN ('Voided', 'Dispensed')
    ORDER BY CASE WHEN p.status = 'Pending verification' THEN 0 WHEN p.status = 'Verified' THEN 1 ELSE 2 END, p.created_at
    LIMIT 200
  `;
}

export async function fetchPatientPrescriptions(email: string) {
  return sql`
    SELECT id, medication_name, strength, directions, quantity, refills, pharmacy, status, created_at, dispensed_at
    FROM prescriptions WHERE patient_email = ${email} AND status <> 'Voided'
    ORDER BY created_at DESC LIMIT 100
  `;
}

export async function fetchClinicalReferrals(email: string, isAdmin: boolean) {
  return sql`
    SELECT r.id, r.patient_email, COALESCE(u.name, r.patient_email) AS patient_name,
      r.appointment_id, r.doctor_email, r.specialty, r.destination, r.reason,
      r.urgency, r.status, r.created_at, r.approved_at, r.sent_at
    FROM clinical_referrals r LEFT JOIN users u ON u.email = r.patient_email
    WHERE r.archived_at IS NULL AND (${isAdmin} OR r.doctor_email = ${email})
    ORDER BY CASE WHEN r.status = 'Needs approval' THEN 0 ELSE 1 END,
      CASE WHEN r.urgency = 'urgent' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 200
  `;
}

export async function fetchPatientReferrals(email: string) {
  return sql`
    SELECT id, specialty, destination, reason, urgency, status, created_at, sent_at
    FROM clinical_referrals WHERE patient_email = ${email} AND archived_at IS NULL AND status IN ('Sent', 'Completed')
    ORDER BY created_at DESC LIMIT 100
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

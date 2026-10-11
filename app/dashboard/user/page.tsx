import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';
import postgres from 'postgres';
import {
  CalendarDaysIcon,
  CreditCardIcon,
  HeartIcon,
  BellAlertIcon,
  PhoneIcon,
  InboxArrowDownIcon,
  ClockIcon,
  PencilIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  PatientAppointmentsSection,
  PatientWalletSection,
  PatientInvoicesSection,
  PatientSupportSection,
} from './client-components';

const supportOptions = [
  { title: 'Phone support', detail: '+1 (555) 014-3344', icon: PhoneIcon },
  {
    title: 'Website support',
    detail: 'chat.mediclinic.example',
    icon: InboxArrowDownIcon,
  },
  {
    title: 'Clinic assistance',
    detail: 'Front desk • Open today 08:00–18:00',
    icon: ClockIcon,
  },
];

async function getPatientDashboardData(email: string) {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not configured.');
  }

  const client = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

  try {
    // Get patient info
    const [user] = await client`SELECT * FROM users WHERE email = ${email} AND role = 'patient' LIMIT 1`;
    
    // Get appointments
    const appointments = await client`
      SELECT
        id,
        doctor_name,
        specialty,
        appointment_date,
        appointment_time,
        reason,
        status,
        amount
      FROM appointments
      WHERE patient_email = ${email}
      ORDER BY appointment_date ASC
      LIMIT 5
    `;

    // Get wallet transactions
    const walletTransactions = await client`
      SELECT
        id,
        amount,
        status,
        created_at,
        description
      FROM wallet_transactions
      WHERE patient_email = ${email}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get wallet balance
    const wallet = await client`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'outgoing' THEN amount ELSE 0 END), 0) AS outgoing,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'pending', 'outgoing') THEN amount ELSE 0 END), 0) AS total
      FROM wallet_transactions
      WHERE patient_email = ${email}
    `;

    // Get invoices
    const invoices = await client`
      SELECT
        id,
        appointment_id,
        amount,
        status,
        created_at,
        due_date
      FROM invoices
      WHERE patient_email = ${email}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Get notifications
    const notifications = await client`
      SELECT
        id,
        type,
        message,
        read,
        created_at
      FROM notifications
      WHERE user_email = ${email} AND user_type = 'patient'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const nextAppointments = appointments.map((item: any) => ({
      id: item.id,
      doctor: item.doctor_name,
      specialty: item.specialty,
      date: new Date(item.appointment_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: item.appointment_time,
      reason: item.reason,
      status: item.status,
      amount: item.amount,
    }));

    const walletValues = wallet[0] ?? {
      paid: 0,
      pending: 0,
      outgoing: 0,
      total: 0,
    };

    const walletSummary = [
      {
        label: 'Wallet Balance',
        value: `$${(Number(walletValues.total ?? 0) / 100).toFixed(2)}`,
        tone: 'emerald',
      },
      {
        label: 'Paid This Month',
        value: `$${(Number(walletValues.paid ?? 0) / 100).toFixed(2)}`,
        tone: 'blue',
      },
      {
        label: 'Pending',
        value: `$${(Number(walletValues.pending ?? 0) / 100).toFixed(2)}`,
        tone: 'amber',
      },
      {
        label: 'Outgoing',
        value: `$${(Number(walletValues.outgoing ?? 0) / 100).toFixed(2)}`,
        tone: 'slate',
      },
    ];

    const formattedTransactions = walletTransactions.map((t: any) => ({
      id: t.id,
      amount: `$${(Number(t.amount ?? 0) / 100).toFixed(2)}`,
      status: t.status,
      description: t.description,
      date: new Date(t.created_at).toLocaleDateString(),
    }));

    const formattedInvoices = invoices.map((i: any) => ({
      id: i.id,
      amount: `$${(Number(i.amount ?? 0) / 100).toFixed(2)}`,
      status: i.status,
      dueDate: new Date(i.due_date).toLocaleDateString(),
      createdDate: new Date(i.created_at).toLocaleDateString(),
    }));

    const unreadNotifications = notifications.filter((n: any) => !n.read).length;

    return {
      patient: user ?? { name: 'Patient', email },
      careHighlights: [
        { label: 'Active prescriptions', value: user?.name ? '3' : '0' },
        { label: 'Booked visits', value: String(nextAppointments.length) },
        { label: 'Lab results', value: '2 new' },
        { label: 'Care plan', value: user?.name ? 'Updated' : 'Pending' },
      ],
      upcomingAppointments: nextAppointments,
      walletSummary,
      walletTransactions: formattedTransactions,
      invoices: formattedInvoices,
      notifications: notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
      })),
      unreadNotifications,
      supportOptions,
    };
  } catch (error) {
    console.error('Patient dashboard data unavailable.', error);
    // Return empty data structure on error instead of throwing
    return {
      patient: { name: 'Patient', email },
      careHighlights: [
        { label: 'Active prescriptions', value: '0' },
        { label: 'Booked visits', value: '0' },
        { label: 'Lab results', value: '0' },
        { label: 'Care plan', value: 'Pending' },
      ],
      upcomingAppointments: [],
      walletSummary: [
        { label: 'Wallet Balance', value: '$0.00', tone: 'emerald' },
        { label: 'Paid This Month', value: '$0.00', tone: 'blue' },
        { label: 'Pending', value: '$0.00', tone: 'amber' },
        { label: 'Outgoing', value: '$0.00', tone: 'slate' },
      ],
      walletTransactions: [],
      invoices: [],
      notifications: [],
      unreadNotifications: 0,
      supportOptions,
    };
  } finally {
    await client.end();
  }
}

export default async function PatientDashboardPage() {
  const session = await auth();
  if (
    session?.user.role !== 'patient' ||
    session.user.email !== TEST_PATIENT_EMAIL
  ) {
    redirect('/unauthorized');
  }

  const data = await getPatientDashboardData(session.user.email ?? TEST_PATIENT_EMAIL);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 pb-12">
      {/* Header */}
      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Patient Portal</p>
            <h1
              className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-900 md:text-3xl`}
            >
              Welcome back, {data.patient?.name ?? 'Patient'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-800">
            <BellAlertIcon className="h-4 w-4" />
            {data.unreadNotifications} notifications
          </div>
        </div>
      </header>

      {/* Patient Profile Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center">
                <UserCircleIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{data.patient?.name ?? 'Patient'}</p>
                <p className="text-sm text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <button className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition">
              <PencilIcon className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Date of Birth</p>
              <p className="font-medium text-slate-900">Not set</p>
            </div>
            <div>
              <p className="text-slate-500">Patient ID</p>
              <p className="font-medium text-slate-900">PT-{session.user.email?.split('@')[0].substring(0, 6).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Health Overview</h3>
          <div className="space-y-3">
            {data.careHighlights.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments Section */}
      <PatientAppointmentsSection appointments={data.upcomingAppointments} />

      {/* Wallet & Invoices Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PatientWalletSection walletSummary={data.walletSummary} transactions={data.walletTransactions} />
        </div>
        <div>
          <PatientInvoicesSection invoices={data.invoices} />
        </div>
      </div>

      {/* Support Section */}
      <PatientSupportSection supportOptions={data.supportOptions} />
    </main>
  );
}

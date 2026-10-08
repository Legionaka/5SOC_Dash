import { auth } from '@/auth';
import { lusitana } from '@/app/ui/fonts';
import { redirect } from 'next/navigation';
import { TEST_PATIENT_EMAIL } from '@/app/lib/access-control';
import postgres from 'postgres';
import {
  CalendarDaysIcon,
  CreditCardIcon,
  HeartIcon,
  ShieldCheckIcon,
  BellAlertIcon,
  PhoneIcon,
  InboxArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const fallbackDashboardData = {
  careHighlights: [
    { label: 'Active prescriptions', value: '3' },
    { label: 'Booked visits', value: '8' },
    { label: 'Lab results', value: '2 new' },
    { label: 'Care plan', value: 'Updated' },
  ],
  upcomingAppointments: [
    {
      doctor: 'Dr. Aisha Morgan',
      specialty: 'General Practice',
      date: 'Tue, 15 Oct 2026',
      time: '09:30 AM',
      reason: 'Annual check-up',
      status: 'Confirmed',
    },
    {
      doctor: 'Dr. Daniel Lee',
      specialty: 'Dermatology',
      date: 'Thu, 17 Oct 2026',
      time: '02:00 PM',
      reason: 'Skin review',
      status: 'Pending',
    },
    {
      doctor: 'Dr. Rachel Singh',
      specialty: 'Cardiology',
      date: 'Mon, 21 Oct 2026',
      time: '11:15 AM',
      reason: 'Follow-up consultation',
      status: 'Reschedule available',
    },
  ],
  walletSummary: [
    { label: 'Wallet Balance', value: '$240.00', tone: 'emerald' },
    { label: 'Paid This Month', value: '$180.00', tone: 'blue' },
    { label: 'Pending', value: '$45.00', tone: 'amber' },
    { label: 'Outgoing', value: '$15.00', tone: 'slate' },
  ],
  healthSummary: [
    { label: 'Allergies', value: 'Penicillin' },
    { label: 'Blood type', value: 'O+' },
    { label: 'Last consultation', value: '12 Sep 2026' },
  ],
  recordItems: [
    'Annual physical report',
    'Vaccination history',
    'Lab result: blood panel',
    'Doctor note: follow-up care plan',
  ],
  supportOptions: [
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
  ],
};

async function getPatientDashboardData(email: string) {
  if (!process.env.POSTGRES_URL) {
    return fallbackDashboardData;
  }

  const client = postgres(process.env.POSTGRES_URL, { ssl: 'require' });

  try {
    const [user] = await client`SELECT name FROM users WHERE email = ${email} LIMIT 1`;
    const appointments = await client`
      SELECT
        doctor_name,
        specialty,
        appointment_date,
        appointment_time,
        reason,
        status
      FROM appointments
      WHERE patient_email = ${email}
      ORDER BY appointment_date ASC
      LIMIT 3
    `;

    const wallet = await client`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'outgoing' THEN amount ELSE 0 END), 0) AS outgoing,
        COALESCE(SUM(CASE WHEN status IN ('paid', 'pending', 'outgoing') THEN amount ELSE 0 END), 0) AS total
      FROM wallet_transactions
      WHERE patient_email = ${email}
    `;

    const nextAppointments = appointments.length
      ? appointments.map((item: any) => ({
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
        }))
      : fallbackDashboardData.upcomingAppointments;

    const walletValues = wallet[0] ?? {};
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

    return {
      careHighlights: [
        { label: 'Active prescriptions', value: '3' },
        { label: 'Booked visits', value: String(nextAppointments.length) },
        { label: 'Lab results', value: '2 new' },
        { label: 'Care plan', value: user?.name ? 'Updated' : 'Awaiting update' },
      ],
      upcomingAppointments: nextAppointments,
      walletSummary,
      healthSummary: fallbackDashboardData.healthSummary,
      recordItems: fallbackDashboardData.recordItems,
      supportOptions: fallbackDashboardData.supportOptions,
    };
  } catch (error) {
    console.error('Patient dashboard data unavailable, using fallback data.', error);
    return fallbackDashboardData;
  } finally {
    await client.end();
  }
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Confirmed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-sky-100 text-sky-800';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
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
    <main className="mx-auto w-full max-w-6xl">
      <header className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Patient Portal</p>
            <h1
              className={`${lusitana.className} mt-2 text-2xl font-bold text-slate-900 md:text-3xl`}
            >
              Welcome back, {session.user.name ?? 'Patient'}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm text-teal-800">
            <BellAlertIcon className="h-4 w-4" />
            2 notifications
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.careHighlights.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className={`${lusitana.className} mt-3 text-2xl font-bold text-slate-900`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                <CalendarDaysIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upcoming appointments</h2>
                <p className="text-sm text-slate-500">Your next medical visits</p>
              </div>
            </div>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Book new visit
            </button>
          </div>

          <div className="space-y-4">
            {data.upcomingAppointments.map((appointment) => (
              <div
                key={`${appointment.doctor}-${appointment.date}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{appointment.doctor}</p>
                    <p className="text-sm text-slate-500">{appointment.specialty}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-slate-700">Date</p>
                    <p>{appointment.date}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Time</p>
                    <p>{appointment.time}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Reason</p>
                    <p>{appointment.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <CreditCardIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Wallet</h2>
                <p className="text-sm text-slate-500">Payment and balance</p>
              </div>
            </div>

            <div className="space-y-3">
              {data.walletSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span
                    className={`text-sm font-semibold ${
                      item.tone === 'emerald'
                        ? 'text-emerald-700'
                        : item.tone === 'blue'
                          ? 'text-blue-700'
                          : item.tone === 'amber'
                            ? 'text-amber-700'
                            : 'text-slate-700'
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <button className="mt-4 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
              Add funds to wallet
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Health summary</h2>
                <p className="text-sm text-slate-500">Current clinical overview</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              {data.healthSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span>{item.label}</span>
                  <span className="font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <HeartIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My records</h2>
              <p className="text-sm text-slate-500">Medical files and recent activity</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.recordItems.map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">{item}</span>
                </div>
                <span className="text-xs text-slate-500">{index + 1} day ago</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <PhoneIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Support</h2>
              <p className="text-sm text-slate-500">Need help? Contact the clinic</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.supportOptions.map(({ title, detail, icon: Icon }) => (
              <div key={title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <div className="rounded-lg bg-white p-2 text-slate-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{title}</p>
                  <p className="text-sm text-slate-600">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

type StatusCount = { status: string; count: number };

const colors = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#475569'];

export default function AppointmentStatusChart({
  data,
  upcomingCount,
  isDemoData = false,
}: {
  data: StatusCount[];
  upcomingCount?: number;
  isDemoData?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + Number(item.count), 0);
  let cursor = 0;
  const segments = data.map((item, index) => {
    const start = cursor;
    cursor += total ? (Number(item.count) / total) * 100 : 0;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="font-semibold text-slate-900">{isDemoData ? 'What could the appointment status mix look like?' : 'What is the appointment status mix today?'}</h3>
      <p className="mt-1 text-sm text-slate-500">{isDemoData ? `Fictional backup example · ${total} sample appointments` : `Share of appointments by current status · ${total} total`}</p>
      {total === 0 ? <p className="mt-6 text-sm text-slate-500">No appointments to chart today.</p> : (
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
          <div
            role="img"
            aria-label={`Appointment status distribution: ${data.map((item) => `${item.status}, ${item.count}`).join('; ')}`}
            className="relative h-36 w-36 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${segments.join(', ')})` }}
          >
            <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-slate-900">{total}</span>
              <span className="text-xs text-slate-500">appointments</span>
            </div>
          </div>
          <ul className="w-full space-y-2">
            {data.map((item, index) => (
              <li key={item.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-slate-600"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />{item.status}</span>
                <span className="font-semibold text-slate-900">{item.count} <span className="font-normal text-slate-500">({Math.round((item.count / total) * 100)}%)</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {upcomingCount !== undefined && <p className="mt-4 text-sm text-slate-600">{upcomingCount} appointment{upcomingCount === 1 ? '' : 's'} scheduled in the next 7 days.</p>}
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{isDemoData ? 'Sample only. Live appointment counts will replace this when the database responds.' : 'Use this snapshot to identify statuses that need follow-up in the appointment queue.'}</p>
    </article>
  );
}

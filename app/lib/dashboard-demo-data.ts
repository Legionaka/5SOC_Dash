import type { Revenue } from './definitions';

export const dashboardDemoRevenue: Revenue[] = [
  { month: 'Mar', revenue: 11200 },
  { month: 'Apr', revenue: 12800 },
  { month: 'May', revenue: 12100 },
  { month: 'Jun', revenue: 14600 },
  { month: 'Jul', revenue: 15800 },
  { month: 'Aug', revenue: 15100 },
  { month: 'Sep', revenue: 17300 },
  { month: 'Oct', revenue: 16600 },
  { month: 'Nov', revenue: 18400 },
  { month: 'Dec', revenue: 19800 },
  { month: 'Jan', revenue: 19100 },
  { month: 'Feb', revenue: 21400 },
];

export const dashboardDemoAppointmentStatuses = [
  { status: 'Confirmed', count: 2 },
  { status: 'Pending', count: 2 },
  { status: 'Reschedule available', count: 1 },
];

export const dashboardDemoOperations = {
  appointments: 5,
  checkedIn: 2,
  waiting: 2,
  openTasks: 3,
  pendingInvoices: 2,
  pendingInvoiceCents: 92500,
  staff: 8,
  doctors: 3,
  nurses: 2,
};

export const dashboardDemoReport = {
  payments: [
    { status: 'paid', count: 3, cents: 287500 },
    { status: 'pending', count: 2, cents: 92500 },
  ],
  upcoming: 5,
  recentActivity: [],
  appointmentStatuses: dashboardDemoAppointmentStatuses,
};

export type AdminReport = {
  payments: { status: string; count: number; cents: number }[];
  upcoming: number;
  recentActivity: { actor_email: string; actor_role: string; action: string; entity_type: string; created_at: Date | string }[];
  appointmentStatuses: { status: string; count: number }[];
};

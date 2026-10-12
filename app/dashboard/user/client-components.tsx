'use client';

import React, { useState } from 'react';
import { lusitana } from '@/app/ui/fonts';
import {
  CalendarDaysIcon,
  DocumentTextIcon,
  WalletIcon,
  HeartIcon,
  ArrowPathIcon,
  XMarkIcon,
  PhoneIcon,
  InboxArrowDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const SUPPORT_OPTIONS = [
  { title: 'Phone support', detail: '+1 (555) 014-3344', icon: PhoneIcon },
  { title: 'Website support', detail: 'chat.mediclinic.example', icon: InboxArrowDownIcon },
  { title: 'Clinic assistance', detail: 'Front desk • Open today 08:00–18:00', icon: ClockIcon },
];

const CONSULTATION_TYPES = [
  {
    id: 'routine_preventive',
    label: 'Routine & Preventive Care',
    examples: 'Annual physicals, vaccinations, screenings',
    duration: 30,
    color: 'blue',
  },
  {
    id: 'acute_illness',
    label: 'Acute Illnesses & Infections',
    examples: 'Respiratory issues, infections, digestive complaints',
    duration: 20,
    color: 'amber',
  },
  {
    id: 'chronic_management',
    label: 'Chronic Condition Management',
    examples: 'Cardiovascular, pain management, respiratory conditions',
    duration: 40,
    color: 'purple',
  },
  {
    id: 'concerning_symptoms',
    label: 'New or Concerning Symptoms',
    examples: 'Skin changes, unexplained symptoms, acute pain',
    duration: 45,
    color: 'red',
  },
  {
    id: 'mental_health_admin',
    label: 'Mental Health & Administrative',
    examples: 'Support, referrals, prescription refills',
    duration: 15,
    color: 'indigo',
  },
];

const DOCTOR_SPECIALTIES = [
  { category: 'Primary Care', doctors: ['General Practitioner', 'Family Physician', 'Internist', 'Pediatrician', 'Geriatrician'] },
  { category: 'Medical Specialists', doctors: ['Cardiologist', 'Dermatologist', 'Endocrinologist', 'Gastroenterologist', 'Neurologist', 'Oncologist', 'Ophthalmologist', 'ENT', 'Pulmonologist', 'Psychiatrist'] },
  { category: 'Surgical Specialists', doctors: ['General Surgeon', 'Orthopedic Surgeon', 'Neurosurgeon', 'Plastic Surgeon'] },
];

export function TransactionStatusBadge({ status }: { status: string }) {
  const color =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-800';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Confirmed'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Pending'
        ? 'bg-amber-100 text-amber-800'
        : status === 'Cancelled'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-sky-100 text-sky-800';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

export function AppointmentBookingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedConsultation, setSelectedConsultation] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const consultationType = CONSULTATION_TYPES.find((c) => c.id === selectedConsultation);

  const handleSaveAndUpdate = async () => {
    setIsLoading(true);
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    onClose();
    setStep(1);
    setSelectedConsultation('');
    setSelectedDoctor('');
    setSelectedSpecialty('');
    setAppointmentDate('');
    setSelectedTime('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className={`${lusitana.className} text-xl font-bold text-slate-900`}>
            Book a New Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-96 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What type of consultation do you need?
                </label>
                <div className="space-y-2">
                  {CONSULTATION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedConsultation(type.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition ${
                        selectedConsultation === type.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{type.label}</p>
                      <p className="text-sm text-slate-600">{type.examples}</p>
                      <p className="text-xs text-slate-500 mt-1">Duration: {type.duration} minutes</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Doctor Specialty
                </label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Choose a specialty...</option>
                  {DOCTOR_SPECIALTIES.map((spec) => (
                    <optgroup key={spec.category} label={spec.category}>
                      {spec.doctors.map((doctor) => (
                        <option key={doctor} value={doctor}>
                          {doctor}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {selectedSpecialty && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select a Doctor
                  </label>
                  <div className="space-y-2">
                    {['Dr. James Smith', 'Dr. Sarah Johnson', 'Dr. Michael Chen'].map((doctor) => (
                      <button
                        key={doctor}
                        onClick={() => setSelectedDoctor(doctor)}
                        className={`w-full text-left rounded-xl border-2 p-3 transition ${
                          selectedDoctor === doctor
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{doctor}</p>
                        <p className="text-sm text-slate-600">{selectedSpecialty} • Available Today</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Times
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                        selectedTime === time
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-teal-500'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {consultationType && (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                  <p className="text-sm font-medium text-teal-800">
                    Appointment Summary
                  </p>
                  <p className="text-xs text-teal-700 mt-2">
                    Type: {consultationType.label} ({consultationType.duration} min)
                  </p>
                  <p className="text-xs text-teal-700">
                    Doctor: {selectedDoctor}
                  </p>
                  <p className="text-xs text-teal-700">
                    Date: {appointmentDate} at {selectedTime}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            className={`px-4 py-2 text-sm font-medium ${
              step === 1
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            disabled={step === 1}
          >
            Back
          </button>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-2 rounded-full transition ${
                  s <= step ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!selectedConsultation || (step === 2 && !selectedDoctor)}
              className="px-4 py-2 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSaveAndUpdate}
              disabled={isLoading || !selectedTime}
              className="px-4 py-2 rounded-lg bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Saving...' : 'Save and Update'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PatientAppointmentsSection({ appointments }: { appointments: any[] }) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
              <CalendarDaysIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
              <p className="text-sm text-slate-500">Your scheduled medical visits</p>
            </div>
          </div>
          <button
            onClick={() => setIsBookingOpen(true)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
          >
            Book New Visit
          </button>
        </div>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <CalendarDaysIcon className="mx-auto h-10 w-10 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">No appointments scheduled yet.</p>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Schedule your first visit
              </button>
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300 transition"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{appointment.doctor}</p>
                    <p className="text-sm text-slate-500">{appointment.specialty} • {appointment.reason}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
                  <div>
                    <p className="font-medium text-slate-700">Date</p>
                    <p>{appointment.date}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Time</p>
                    <p>{appointment.time}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Duration</p>
                    <p>30 mins</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Cost</p>
                    <p className="text-teal-600 font-semibold">${(appointment.amount / 100).toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                    Reschedule
                  </button>
                  <button className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition">
                    Cancel & Refund
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <AppointmentBookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} />
    </>
  );
}

export function PatientWalletSection({ walletSummary, transactions }: { walletSummary: any[]; transactions: any[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
          <WalletIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Digital Wallet</h2>
          <p className="text-sm text-slate-500">Payment balance and transaction history</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {walletSummary.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">{item.label}</p>
            <p
              className={`text-lg font-bold ${
                item.tone === 'emerald'
                  ? 'text-emerald-600'
                  : item.tone === 'blue'
                    ? 'text-blue-600'
                    : item.tone === 'amber'
                      ? 'text-amber-600'
                      : 'text-slate-600'
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Recent Transactions</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No transactions yet</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{tx.description}</p>
                  <p className="text-slate-500">{tx.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{tx.amount}</p>
                  <TransactionStatusBadge status={tx.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition">
          Add Funds
        </button>
        <button className="flex-1 rounded-lg bg-slate-50 border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
          Request Refund
        </button>
      </div>
    </section>
  );
}

export function PatientInvoicesSection({ invoices }: { invoices: any[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
          <DocumentTextIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500">Billing history</p>
        </div>
      </div>

      <div className="space-y-2">
        {invoices.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">No invoices yet</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs hover:bg-slate-100 transition cursor-pointer">
              <div>
                <p className="font-medium text-slate-900">INV-{invoice.id.substring(0, 8)}</p>
                <p className="text-slate-500">{invoice.createdDate}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{invoice.amount}</p>
                <TransactionStatusBadge status={invoice.status} />
              </div>
            </div>
          ))
        )}
      </div>

      <button className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 transition">
        View All Invoices
      </button>
    </section>
  );
}

export function PatientSupportSection() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
          <HeartIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Need Help?</h2>
          <p className="text-sm text-slate-500">Contact us via your preferred method</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SUPPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-slate-300 hover:bg-white transition text-left"
            >
              <div className="rounded-lg bg-indigo-100 p-2 w-fit mb-3 text-indigo-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-900">{option.title}</p>
              <p className="text-sm text-slate-600 mt-1">{option.detail}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

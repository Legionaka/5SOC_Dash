-- Demo-only appointment data for the admin status doughnut.
-- Run today, the day before the presentation. The dashboard chart groups
-- appointments for CURRENT_DATE, so tomorrow's rows appear on demo day.
-- Uses the fictional demo patient account and marks every reason clearly.

BEGIN;

WITH demo_rows (
  patient_email,
  doctor_name,
  specialty,
  appointment_date,
  appointment_time,
  reason,
  status
) AS (
  VALUES
    ('user@nextmail.com', 'Dr. Aisha Morgan', 'General Practice', CURRENT_DATE,     '10:00 AM', 'DEMO CHART - routine follow-up', 'Completed'),
    ('user@nextmail.com', 'Dr. Daniel Lee',   'Dermatology',       CURRENT_DATE,     '11:30 AM', 'DEMO CHART - skin review',       'Confirmed'),
    ('user@nextmail.com', 'Dr. Rachel Singh', 'Cardiology',        CURRENT_DATE,     '01:00 PM', 'DEMO CHART - heart follow-up',   'Pending'),
    ('user@nextmail.com', 'Dr. Aisha Morgan', 'General Practice', CURRENT_DATE,     '02:30 PM', 'DEMO CHART - cancelled visit',   'Cancelled'),
    ('user@nextmail.com', 'Dr. Aisha Morgan', 'General Practice', CURRENT_DATE + 1, '09:00 AM', 'DEMO CHART - annual check-up',   'Confirmed'),
    ('user@nextmail.com', 'Dr. Daniel Lee',   'Dermatology',       CURRENT_DATE + 1, '10:30 AM', 'DEMO CHART - skin review',       'Confirmed'),
    ('user@nextmail.com', 'Dr. Rachel Singh', 'Cardiology',        CURRENT_DATE + 1, '11:45 AM', 'DEMO CHART - heart follow-up',   'Pending'),
    ('user@nextmail.com', 'Dr. Aisha Morgan', 'General Practice', CURRENT_DATE + 1, '01:30 PM', 'DEMO CHART - routine visit',     'Pending'),
    ('user@nextmail.com', 'Dr. Daniel Lee',   'Dermatology',       CURRENT_DATE + 1, '03:00 PM', 'DEMO CHART - alternate slot',    'Reschedule available')
)
INSERT INTO public.appointments (
  patient_email,
  doctor_name,
  specialty,
  appointment_date,
  appointment_time,
  reason,
  status
)
SELECT
  d.patient_email,
  d.doctor_name,
  d.specialty,
  d.appointment_date,
  d.appointment_time,
  d.reason,
  d.status
FROM demo_rows AS d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.appointments AS existing
  WHERE existing.patient_email = d.patient_email
    AND existing.appointment_date = d.appointment_date
    AND existing.appointment_time = d.appointment_time
    AND existing.reason = d.reason
);

COMMIT;

-- Confirm the rows and the status counts for today and tomorrow.
SELECT appointment_date, status, COUNT(*) AS appointment_count
FROM public.appointments
WHERE patient_email = 'user@nextmail.com'
  AND reason LIKE 'DEMO CHART -%'
  AND appointment_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 1
GROUP BY appointment_date, status
ORDER BY appointment_date, status;

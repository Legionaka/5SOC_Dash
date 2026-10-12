import postgres from 'postgres';

export const runtime = 'nodejs';
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

type FhirCoding = { display?: unknown; code?: unknown };
type FhirDiagnosticReport = {
  resourceType?: unknown;
  id?: unknown;
  status?: unknown;
  subject?: { identifier?: { value?: unknown }; reference?: unknown };
  code?: { text?: unknown; coding?: FhirCoding[] };
  conclusion?: unknown;
  conclusionCode?: Array<{ text?: unknown; coding?: FhirCoding[] }>;
  performer?: Array<{ display?: unknown }>;
};

function display(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const integrationToken = process.env.LAB_INTEGRATION_TOKEN;
  if (!integrationToken) return Response.json({ error: 'Lab integration is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${integrationToken}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let report: FhirDiagnosticReport;
  try {
    report = await request.json() as FhirDiagnosticReport;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (report.resourceType !== 'DiagnosticReport' || !['final', 'amended', 'corrected'].includes(display(report.status))) {
    return Response.json({ error: 'Expected a final FHIR R4 DiagnosticReport.' }, { status: 400 });
  }

  const subjectValue = display(report.subject?.identifier?.value);
  const subjectReference = display(report.subject?.reference);
  const email = (subjectValue || (subjectReference.startsWith('Patient/') ? subjectReference.slice(8) : '')).toLowerCase();
  const reportId = display(report.id);
  const name = display(report.code?.text) || report.code?.coding?.map((coding) => display(coding.display) || display(coding.code)).find(Boolean) || '';
  const summary = display(report.conclusion) || report.conclusionCode?.map((concept) => display(concept.text) || concept.coding?.map((coding) => display(coding.display) || display(coding.code)).find(Boolean) || '').filter(Boolean).join('; ');
  if (!email || !reportId || !name || !summary) {
    return Response.json({ error: 'Report must include an ID, patient email identifier, test name, and clinical conclusion.' }, { status: 400 });
  }

  try {
    const [patient] = await sql`SELECT email FROM users WHERE email = ${email} AND role = 'patient' LIMIT 1`;
    if (!patient) return Response.json({ error: 'Patient identifier did not match a patient account.' }, { status: 422 });
    const source = display(report.performer?.[0]?.display) || 'FHIR laboratory';
    const critical = /critical|panic/i.test(`${summary} ${report.conclusionCode?.map((item) => item.coding?.map((coding) => display(coding.display)).join(' ')).join(' ')}`);
    const [inserted] = await sql`
      INSERT INTO diagnostic_results (patient_email, doctor_email, test_name, result_summary, source_system, external_report_id, priority)
      VALUES (${patient.email}, 'lab-integration', ${name}, ${summary}, ${source}, ${reportId}, ${critical ? 'critical' : 'routine'})
      ON CONFLICT (source_system, external_report_id) WHERE external_report_id IS NOT NULL DO NOTHING
      RETURNING id
    `;
    if (!inserted) return Response.json({ received: true, duplicate: true, reportId }, { status: 200 });
    await sql`
      INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
      VALUES ('lab-integration', 'integration', 'diagnostic_result.imported', 'diagnostic_result', ${inserted.id}, ${sql.json({ source, reportId, patientEmail: patient.email })})
    `;
    return Response.json({ received: true, reportId: String(inserted.id), status: 'Pending clinical review' }, { status: 201 });
  } catch (error) {
    console.error('FHIR lab result intake failed:', error);
    return Response.json({ error: 'Unable to store diagnostic report.' }, { status: 500 });
  }
}

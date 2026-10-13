import postgres from 'postgres';
import { auth } from '@/auth';
import { createInvoicePdf } from '@/app/lib/invoice-pdf';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.email) return new Response('Unauthorized', { status: 401 });

  const { id } = await context.params;
  const [invoice] = await sql<{
    id: string;
    amount: number;
    status: string;
    date: string;
    customer_name: string;
    customer_email: string;
  }[]>`
    SELECT i.id, i.amount, i.status, i.date, c.name AS customer_name, c.email AS customer_email
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ${id}
    LIMIT 1
  `;

  const canDownload = ['admin', 'pharmacy_reception'].includes(session.user.role) || (
    session.user.role === 'patient' && invoice && invoice.customer_email.toLowerCase() === session.user.email.toLowerCase()
  );
  if (!invoice || !canDownload) return new Response('Not found', { status: 404 });

  const pdf = await createInvoicePdf({
    id: String(invoice.id),
    amount: Number(invoice.amount),
    status: invoice.status,
    date: String(invoice.date),
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
  });

  await sql`
    INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
    VALUES (${session.user.email}, ${session.user.role}, 'invoice.pdf_downloaded', 'invoice', ${invoice.id}, ${sql.json({ invoiceNumber: `INV-${String(invoice.id).slice(0, 8).toUpperCase()}` })})
  `;

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${String(invoice.id).slice(0, 8)}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

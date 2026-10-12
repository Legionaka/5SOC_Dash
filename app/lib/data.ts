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
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
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
    // #region agent log
    fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId:'A',location:'app/lib/data.ts:probePatientDashboardData',message:'schema columns',data:{invoiceColumns:result.invoiceColumns,customerColumns:result.customerColumns,userColumns:result.userColumns,emailPresent},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (error) {
    const err = error as { message?: string; code?: string };
    // #region agent log
    fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId:'A',location:'app/lib/data.ts:probePatientDashboardData',message:'schema probe failed',data:{message:err.message,code:err.code},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  const tryQuery = async (
    hypothesisId: string,
    label: string,
    query: () => Promise<unknown>,
  ) => {
    try {
      await query();
      // #region agent log
      fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId,location:'app/lib/data.ts:tryQuery',message:'query ok',data:{label},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return 'ok';
    } catch (error) {
      const err = error as { message?: string; code?: string; position?: string };
      // #region agent log
      fetch('http://127.0.0.1:7826/ingest/f67fa5db-0508-44bf-803c-d13bfd7999ec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7d5deb'},body:JSON.stringify({sessionId:'7d5deb',runId:'pre-fix',hypothesisId,location:'app/lib/data.ts:tryQuery',message:'query failed',data:{label,message:err.message,code:err.code,position:err.position},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

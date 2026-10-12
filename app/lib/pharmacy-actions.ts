'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import postgres from 'postgres';
import { z } from 'zod';
import { ensurePharmacyInventorySchema } from './pharmacy-schema';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function pharmacyActor(roles: string[]) {
  const session = await auth();
  if (!session?.user.email || !roles.includes(session.user.role ?? '')) return null;
  return { email: session.user.email, role: session.user.role ?? 'staff' };
}

const ItemSchema = z.object({
  medicineName: z.string().trim().min(2).max(160),
  strength: z.string().trim().max(80),
  batchNumber: z.string().trim().min(1).max(100),
  quantity: z.number().int().min(0).max(100000),
  reorderLevel: z.number().int().min(0).max(100000),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export async function addPharmacyInventoryItem(input: z.infer<typeof ItemSchema>) {
  const actor = await pharmacyActor(['admin', 'pharmacy_stocker']);
  const parsed = ItemSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Check the item details and your access.' };
  await ensurePharmacyInventorySchema();
  const value = parsed.data;
  try {
    await sql.begin(async (tx) => {
      const [item] = await tx`
        INSERT INTO pharmacy_inventory (medicine_name, strength, batch_number, quantity, reorder_level, expires_on)
        VALUES (${value.medicineName}, ${value.strength}, ${value.batchNumber}, ${value.quantity}, ${value.reorderLevel}, ${value.expiresOn || null})
        RETURNING id
      `;
      if (value.quantity > 0) await tx`
        INSERT INTO pharmacy_inventory_transactions (item_id, actor_email, quantity_change, reason)
        VALUES (${item.id}, ${actor.email}, ${value.quantity}, 'Initial stock received')
      `;
      await tx`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${actor.email}, ${actor.role}, 'pharmacy.inventory_item_created', 'pharmacy_inventory', ${item.id}, ${tx.json({ medicineName: value.medicineName, batchNumber: value.batchNumber, quantity: value.quantity })})
      `;
    });
    revalidatePath('/dashboard/pharmacy/stock');
    revalidatePath('/dashboard/pharmacy/pharmacist');
    return { success: true, message: 'Inventory batch added.' };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return { success: false, message: 'That medicine batch is already in inventory.' };
    console.error('Inventory item creation failed:', error);
    return { success: false, message: 'We could not add this inventory batch.' };
  }
}

const AdjustmentSchema = z.object({
  itemId: z.string().uuid(),
  quantityChange: z.number().int().min(-100000).max(100000).default(0),
  reorderLevel: z.number().int().min(0).max(100000).optional(),
  reason: z.string().trim().min(3).max(240),
}).refine((value) => value.quantityChange !== 0 || value.reorderLevel !== undefined, { message: 'Change stock or the reorder level.' });

export async function adjustPharmacyInventory(input: z.infer<typeof AdjustmentSchema>) {
  const actor = await pharmacyActor(['admin', 'pharmacy_stocker']);
  const parsed = AdjustmentSchema.safeParse(input);
  if (!actor || !parsed.success) return { success: false, message: 'Enter a valid stock adjustment and reason.' };
  await ensurePharmacyInventorySchema();
  const value = parsed.data;
  try {
    const changed = await sql.begin(async (tx) => {
      const [item] = await tx`
        UPDATE pharmacy_inventory
        SET quantity = quantity + ${value.quantityChange},
            reorder_level = COALESCE(${value.reorderLevel ?? null}, reorder_level),
            updated_at = NOW()
        WHERE id = ${value.itemId} AND quantity + ${value.quantityChange} >= 0
        RETURNING id, medicine_name, reorder_level
      `;
      if (!item) return false;
      if (value.quantityChange !== 0) await tx`
        INSERT INTO pharmacy_inventory_transactions (item_id, actor_email, quantity_change, reason)
        VALUES (${value.itemId}, ${actor.email}, ${value.quantityChange}, ${value.reason})
      `;
      await tx`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${actor.email}, ${actor.role}, 'pharmacy.inventory_adjusted', 'pharmacy_inventory', ${value.itemId}, ${tx.json({ medicineName: item.medicine_name, quantityChange: value.quantityChange, reorderLevel: item.reorder_level, reason: value.reason })})
      `;
      return true;
    });
    if (!changed) return { success: false, message: 'Batch not found or the adjustment would make stock negative.' };
    revalidatePath('/dashboard/pharmacy/stock');
    revalidatePath('/dashboard/pharmacy/pharmacist');
    return { success: true, message: 'Inventory update saved.' };
  } catch (error) {
    console.error('Inventory adjustment failed:', error);
    return { success: false, message: 'We could not record this adjustment.' };
  }
}

export async function recordInPersonPayment(invoiceId: string) {
  const actor = await pharmacyActor(['admin', 'pharmacy_reception']);
  const id = z.string().uuid().safeParse(invoiceId);
  if (!actor || !id.success) return { success: false, message: 'You cannot record this payment.' };
  try {
    const invoice = await sql.begin(async (tx) => {
      const [pending] = await tx`
        SELECT i.amount, c.email, c.name
        FROM invoices i JOIN customers c ON c.id = i.customer_id
        WHERE i.id = ${id.data} AND i.status = 'pending'
        FOR UPDATE OF i
      `;
      if (!pending) return null;
      const [paid] = await tx`UPDATE invoices SET status = 'paid' WHERE id = ${id.data} AND status = 'pending' RETURNING id`;
      if (!paid) return null;
      await tx`
        INSERT INTO wallet_transactions (patient_email, amount, status, description)
        VALUES (${pending.email}, ${pending.amount}, 'completed', 'In-person payment recorded at reception')
      `;
      await tx`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, metadata)
        VALUES (${actor.email}, ${actor.role}, 'invoice.in_person_payment_recorded', 'invoice', ${id.data}, ${tx.json({ patientEmail: pending.email, amountCents: pending.amount })})
      `;
      await tx`
        INSERT INTO notifications (user_email, user_type, type, message)
        SELECT ${pending.email}, 'patient', 'invoice_paid', 'Your invoice payment was recorded by clinic reception.'
        WHERE EXISTS (SELECT 1 FROM users WHERE email = ${pending.email} AND role = 'patient')
      `;
      return pending;
    });
    if (!invoice) return { success: false, message: 'This invoice is no longer pending.' };
    revalidatePath('/dashboard/pharmacy/reception');
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/user');
    revalidatePath('/dashboard/user/invoices');
    return { success: true, message: `Payment for ${invoice.name} recorded.` };
  } catch (error) {
    console.error('In-person payment failed:', error);
    return { success: false, message: 'We could not record this payment.' };
  }
}

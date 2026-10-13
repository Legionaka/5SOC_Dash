-- Ensure each invoice references a real customer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoices_customer_id_fkey'
      AND conrelid = 'public.invoices'::regclass
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) NOT VALID;
  END IF;
END
$$;

-- Fail visibly if existing invoice rows contain an invalid customer reference.
ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_customer_id_fkey;

CREATE TABLE escrow_transactions (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  amount REAL,
  status TEXT DEFAULT 'funded',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE invoices
ADD COLUMN escrow_status TEXT DEFAULT 'pending';

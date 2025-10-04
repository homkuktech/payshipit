
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  invoice_code TEXT UNIQUE,
  total_amount REAL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  description TEXT,
  quantity INTEGER,
  price REAL
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  rider_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  pickup_location TEXT,
  delivery_location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

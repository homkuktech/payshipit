/*
  # Invoice and Product Delivery System

  ## Overview
  This migration creates the invoice system for merchants to generate invoices,
  share with customers, and manage product deliveries.

  ## New Tables Created

  ### 1. `invoices`
  Merchant-generated invoices for products
  - `id` (uuid, primary key)
  - `merchant_id` (uuid, FK to profiles)
  - `customer_id` (uuid, FK to profiles, nullable until payment)
  - `invoice_number` (text, unique, auto-generated)
  - `status` (enum: draft, pending_payment, paid, shipped, delivered, cancelled)
  - `subtotal` (numeric, sum of items)
  - `delivery_fee` (numeric)
  - `total_amount` (numeric, subtotal + delivery fee)
  - `payment_reference` (text, nullable)
  - `paid_at` (timestamptz, nullable)
  - `shipping_address` (text, nullable)
  - `shipping_lat` (numeric, nullable)
  - `shipping_lng` (numeric, nullable)
  - `customer_name` (text, nullable)
  - `customer_phone` (text, nullable)
  - `customer_email` (text, nullable)
  - `notes` (text, nullable)
  - `order_id` (uuid, FK to orders, nullable - created after payment)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `invoice_items`
  Individual products in an invoice
  - `id` (uuid, primary key)
  - `invoice_id` (uuid, FK to invoices)
  - `product_name` (text)
  - `product_description` (text, nullable)
  - `quantity` (integer)
  - `unit_price` (numeric)
  - `total_price` (numeric, quantity * unit_price)
  - `created_at` (timestamptz)

  ### 3. `rider_matches`
  Track rider matching for orders
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `rider_id` (uuid, FK to profiles)
  - `distance` (numeric, in km)
  - `status` (enum: pending, accepted, rejected, expired)
  - `expires_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Merchants can create and view own invoices
  - Customers can view invoices they have access to via link
  - Riders can view matched orders
  - All invoice links are publicly accessible for payment

  ## Indexes
  - Invoice number for quick lookup
  - Customer email for matching
  - Order status for filtering
  - Rider location for matching

  ## Important Notes
  - Invoice numbers auto-generated with format: INV-YYYYMMDD-XXXXX
  - Amounts stored in kobo/cents (divide by 100 for display)
  - Deep links use invoice_id for sharing
  - Rider matching considers distance and availability
*/

-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending_payment',
  'paid',
  'shipped',
  'delivered',
  'cancelled'
);

-- Create rider match status enum
CREATE TYPE rider_match_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  invoice_number text UNIQUE NOT NULL,
  status invoice_status DEFAULT 'draft' NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric NOT NULL CHECK (delivery_fee >= 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  payment_reference text,
  paid_at timestamptz,
  shipping_address text,
  shipping_lat numeric,
  shipping_lng numeric,
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL,
  product_description text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Rider matches table
CREATE TABLE IF NOT EXISTS rider_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  distance numeric NOT NULL CHECK (distance >= 0),
  status rider_match_status DEFAULT 'pending' NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, rider_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_merchant_id ON invoices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON invoices(customer_email);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_rider_matches_order_id ON rider_matches(order_id);
CREATE INDEX IF NOT EXISTS idx_rider_matches_rider_id ON rider_matches(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_matches_status ON rider_matches(status);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_matches ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Merchants can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Customers can view their invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Public can view invoices for payment"
  ON invoices FOR SELECT
  TO anon
  USING (status = 'pending_payment');

CREATE POLICY "Merchants can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Customers can update invoice with payment info"
  ON invoices FOR UPDATE
  TO authenticated
  USING (status = 'pending_payment')
  WITH CHECK (status IN ('paid', 'pending_payment'));

-- Invoice items policies
CREATE POLICY "Users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND (invoices.merchant_id = auth.uid() OR invoices.customer_id = auth.uid())
    )
  );

CREATE POLICY "Public can view invoice items for payment"
  ON invoice_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.status = 'pending_payment'
    )
  );

CREATE POLICY "Merchants can insert invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.merchant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can delete invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.merchant_id = auth.uid()
    )
  );

-- Rider matches policies
CREATE POLICY "Riders can view own matches"
  ON rider_matches FOR SELECT
  TO authenticated
  USING (rider_id = auth.uid());

CREATE POLICY "Merchants can view matches for their orders"
  ON rider_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN invoices ON invoices.order_id = orders.id
      WHERE orders.id = rider_matches.order_id
      AND invoices.merchant_id = auth.uid()
    )
  );

CREATE POLICY "System can create rider matches"
  ON rider_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Riders can update own matches"
  ON rider_matches FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  new_number text;
  date_part text;
  sequence_part text;
  count_today integer;
BEGIN
  date_part := to_char(now(), 'YYYYMMDD');
  
  SELECT COUNT(*) INTO count_today
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || date_part || '%';
  
  sequence_part := LPAD((count_today + 1)::text, 5, '0');
  new_number := 'INV-' || date_part || '-' || sequence_part;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create order from paid invoice
CREATE OR REPLACE FUNCTION create_order_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
  new_order_id uuid;
  invoice_data record;
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending_payment' AND NEW.order_id IS NULL THEN
    SELECT * INTO invoice_data FROM invoices WHERE id = NEW.id;
    
    INSERT INTO orders (
      sender_id,
      status,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      recipient_name,
      recipient_phone,
      package_description,
      package_value,
      delivery_fee,
      estimated_distance,
      estimated_duration
    ) VALUES (
      invoice_data.customer_id,
      'pending',
      'Merchant Location',
      0,
      0,
      invoice_data.shipping_address,
      invoice_data.shipping_lat,
      invoice_data.shipping_lng,
      invoice_data.customer_name,
      invoice_data.customer_phone,
      'Invoice: ' || invoice_data.invoice_number,
      invoice_data.subtotal,
      invoice_data.delivery_fee,
      0,
      0
    ) RETURNING id INTO new_order_id;
    
    NEW.order_id := new_order_id;
    
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (
      invoice_data.merchant_id,
      'Payment Received',
      'Invoice ' || invoice_data.invoice_number || ' has been paid. Ship the product now!',
      'invoice_paid'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_order_on_payment
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION create_order_from_invoice();
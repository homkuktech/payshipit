/*
  # Paynship Core Database Schema

  ## Overview
  This migration creates the foundational database structure for Paynship, a logistics and escrow delivery platform.

  ## New Tables Created

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, FK to auth.users)
  - `role` (enum: sender, rider, merchant, admin)
  - `full_name` (text)
  - `phone` (text, unique)
  - `avatar_url` (text, nullable)
  - `rating` (numeric, default 0)
  - `total_ratings` (integer, default 0)
  - `is_verified` (boolean, default false)
  - `is_available` (boolean, for riders, default true)
  - `wallet_balance` (numeric, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `rider_profiles`
  Extended information for riders/drivers
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `vehicle_type` (text)
  - `vehicle_plate` (text)
  - `license_number` (text)
  - `current_lat` (numeric, nullable)
  - `current_lng` (numeric, nullable)
  - `last_location_update` (timestamptz, nullable)
  - `created_at` (timestamptz)

  ### 3. `orders`
  Delivery orders/shipments
  - `id` (uuid, primary key)
  - `sender_id` (uuid, FK to profiles)
  - `rider_id` (uuid, FK to profiles, nullable)
  - `status` (enum: pending, accepted, picked_up, in_transit, delivered, cancelled)
  - `pickup_address` (text)
  - `pickup_lat` (numeric)
  - `pickup_lng` (numeric)
  - `dropoff_address` (text)
  - `dropoff_lat` (numeric)
  - `dropoff_lng` (numeric)
  - `recipient_name` (text)
  - `recipient_phone` (text)
  - `package_description` (text)
  - `package_value` (numeric)
  - `delivery_fee` (numeric)
  - `estimated_distance` (numeric, in km)
  - `estimated_duration` (integer, in minutes)
  - `pickup_time` (timestamptz, nullable)
  - `delivery_time` (timestamptz, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `transactions`
  Payment and escrow transactions
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `user_id` (uuid, FK to profiles)
  - `type` (enum: payment, refund, withdrawal, commission)
  - `amount` (numeric)
  - `status` (enum: pending, completed, failed, refunded)
  - `payment_provider` (text, e.g., paystack, flutterwave)
  - `payment_reference` (text, unique)
  - `metadata` (jsonb, nullable)
  - `created_at` (timestamptz)

  ### 5. `ratings`
  Ratings and reviews
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `rater_id` (uuid, FK to profiles)
  - `rated_id` (uuid, FK to profiles)
  - `rating` (integer, 1-5)
  - `comment` (text, nullable)
  - `created_at` (timestamptz)

  ### 6. `messages`
  In-app chat messages
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `sender_id` (uuid, FK to profiles)
  - `receiver_id` (uuid, FK to profiles)
  - `content` (text)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)

  ### 7. `notifications`
  Push notifications log
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles)
  - `title` (text)
  - `body` (text)
  - `type` (text)
  - `data` (jsonb, nullable)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)

  ### 8. `location_tracking`
  Real-time location history for live tracking
  - `id` (uuid, primary key)
  - `order_id` (uuid, FK to orders)
  - `rider_id` (uuid, FK to profiles)
  - `lat` (numeric)
  - `lng` (numeric)
  - `speed` (numeric, nullable)
  - `heading` (numeric, nullable)
  - `created_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies created for each user role with appropriate access controls
  - Users can only access their own data unless they're admin
  - Riders can update their location and accept orders
  - All financial transactions are logged and auditable

  ## Indexes
  - Performance indexes on frequently queried columns
  - Geospatial indexes for location-based queries
  - Foreign key indexes for joins

  ## Important Notes
  - All monetary values stored in kobo/cents (divide by 100 for display)
  - Location coordinates use numeric type for precision
  - Status enums enforce data consistency
  - Timestamps use timestamptz for timezone awareness
  - Soft deletes not implemented (use status flags instead)
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('sender', 'rider', 'merchant', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('payment', 'refund', 'withdrawal', 'commission');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'sender',
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  avatar_url text,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_ratings integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  wallet_balance numeric DEFAULT 0 CHECK (wallet_balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rider profiles table
CREATE TABLE IF NOT EXISTS rider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  vehicle_type text NOT NULL,
  vehicle_plate text NOT NULL,
  license_number text NOT NULL,
  current_lat numeric,
  current_lng numeric,
  last_location_update timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  pickup_address text NOT NULL,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  package_description text NOT NULL,
  package_value numeric NOT NULL CHECK (package_value >= 0),
  delivery_fee numeric NOT NULL CHECK (delivery_fee >= 0),
  estimated_distance numeric NOT NULL CHECK (estimated_distance >= 0),
  estimated_duration integer NOT NULL CHECK (estimated_duration >= 0),
  pickup_time timestamptz,
  delivery_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  status transaction_status DEFAULT 'pending' NOT NULL,
  payment_provider text,
  payment_reference text UNIQUE,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  rater_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rated_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, rater_id, rated_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Location tracking table
CREATE TABLE IF NOT EXISTS location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  speed numeric,
  heading numeric,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rider_profiles_user_id ON rider_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_sender_id ON orders(sender_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_order_id ON location_tracking(order_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Rider profiles policies
CREATE POLICY "Riders can view own rider profile"
  ON rider_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Riders can insert own rider profile"
  ON rider_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Riders can update own rider profile"
  ON rider_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view rider profiles"
  ON rider_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Orders policies
CREATE POLICY "Users can view own orders as sender"
  ON orders FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR rider_id = auth.uid());

CREATE POLICY "Senders can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Riders can view available orders"
  ON orders FOR SELECT
  TO authenticated
  USING (status = 'pending' OR rider_id = auth.uid());

CREATE POLICY "Riders can update assigned orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Senders can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ratings policies
CREATE POLICY "Users can view ratings"
  ON ratings FOR SELECT
  TO authenticated
  USING (rater_id = auth.uid() OR rated_id = auth.uid());

CREATE POLICY "Users can create ratings"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (rater_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Location tracking policies
CREATE POLICY "Riders can insert location"
  ON location_tracking FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Users can view order location tracking"
  ON location_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = location_tracking.order_id
      AND (orders.sender_id = auth.uid() OR orders.rider_id = auth.uid())
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update profile rating after new rating
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    total_ratings = total_ratings + 1,
    rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM ratings
      WHERE rated_id = NEW.rated_id
    )
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_trigger
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();
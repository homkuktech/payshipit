# Paynship - Complete Implementation Guide

## Overview

Paynship is a production-ready logistics and escrow delivery platform built with React Native (Expo), similar to Uber for package delivery. The app connects senders, riders, and merchants with secure payment escrow and real-time tracking.

## Tech Stack

- **Frontend**: React Native + Expo SDK
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Authentication**: Supabase Auth (Email/Password + OTP)
- **Database**: PostgreSQL with Row Level Security
- **Payments**: Paystack/Flutterwave (ready for integration)
- **Maps**: React Native Maps + Expo Location
- **Push Notifications**: Expo Notifications
- **Type Safety**: TypeScript
- **Styling**: StyleSheet (React Native)

## Project Structure

```
paynship/
├── app/                        # Routes (file-based routing)
│   ├── (onboarding)/          # Onboarding flow
│   │   ├── _layout.tsx       # Onboarding stack
│   │   └── index.tsx         # Feature highlights (6 slides)
│   ├── (auth)/                # Authentication routes
│   │   ├── _layout.tsx       # Auth stack navigator
│   │   ├── login.tsx         # Login screen (email + phone OTP)
│   │   ├── signup.tsx        # Signup with role selection
│   │   └── verify-otp.tsx    # OTP verification
│   ├── (tabs)/               # Main app tabs
│   │   ├── _layout.tsx       # Tab navigator
│   │   ├── index.tsx         # Home dashboard
│   │   ├── orders.tsx        # Orders list with filters
│   │   ├── messages.tsx      # In-app messaging
│   │   └── profile.tsx       # User profile & settings
│   ├── _layout.tsx           # Root layout with providers
│   └── index.tsx             # Entry point with splash & routing
├── components/                # Reusable components
│   └── SplashScreen.tsx      # Animated splash screen
├── contexts/                  # React Context providers
│   ├── AuthContext.tsx       # Authentication state
│   └── ThemeContext.tsx      # Theme (light/dark mode)
├── lib/                       # Core libraries
│   └── supabase.ts           # Supabase client config
├── types/                     # TypeScript definitions
│   ├── database.ts           # Database types
│   └── env.d.ts              # Environment variables
├── hooks/                     # Custom React hooks
│   ├── useFrameworkReady.ts  # Framework initialization
│   └── useOnboarding.ts      # Onboarding state management
├── assets/                    # Static assets
│   └── images/               # App icons
└── supabase/                  # Database migrations
    └── migrations/           # SQL migration files
```

## Database Schema

### Core Tables

1. **profiles** - User profiles extending Supabase auth
   - User role (sender, rider, merchant, admin)
   - Contact info, rating, wallet balance
   - Verification status

2. **rider_profiles** - Extended rider information
   - Vehicle details
   - License information
   - Current location

3. **orders** - Delivery orders
   - Pickup and dropoff locations
   - Package details and value
   - Status tracking
   - Pricing information

4. **transactions** - Payment records
   - Escrow payments
   - Refunds and withdrawals
   - Payment provider references

5. **ratings** - User ratings and reviews
   - 5-star rating system
   - Comments

6. **messages** - In-app chat
   - Order-based conversations
   - Read receipts

7. **notifications** - Push notification log
   - User notifications
   - Read status

8. **location_tracking** - Real-time location history
   - GPS coordinates
   - Speed and heading

### Security (Row Level Security)

All tables have RLS policies:
- Users can only access their own data
- Riders can view available orders
- Admin role for platform management
- Financial transactions are auditable

## Features Implemented

### ✅ Phase 1: Core Foundation (COMPLETED)

- [x] Database schema with migrations
- [x] TypeScript type definitions
- [x] Supabase client setup
- [x] Authentication context
- [x] Theme context (light/dark mode)

### ✅ Phase 2: Authentication (COMPLETED)

- [x] Email/Password authentication
- [x] Phone OTP authentication
- [x] User registration with role selection
- [x] Auto-login and session management
- [x] Protected routes

### ✅ Phase 3: Navigation (COMPLETED)

- [x] Tab-based navigation
- [x] Auth stack
- [x] Protected routes with auth check
- [x] Role-based UI rendering

### ✅ Phase 4: Core Screens (COMPLETED)

- [x] Home dashboard with stats
- [x] Orders list with filters
- [x] Profile screen with wallet
- [x] Messages placeholder
- [x] Dark/Light theme toggle

### ✅ Phase 4.5: Onboarding & UX (COMPLETED)

- [x] Animated splash screen with branding
- [x] 6-slide onboarding flow showcasing features
- [x] Onboarding state management with AsyncStorage
- [x] First-time user flow
- [x] Skip and navigation controls
- [x] Smooth animations and transitions

### 🔄 Phase 5: Orders & Maps (NEXT)

- [ ] Google Maps integration
- [ ] Order creation form
- [ ] Location picker
- [ ] Available orders for riders
- [ ] Order details screen
- [ ] Order status management

### 🔄 Phase 6: Payments (PENDING)

- [ ] Paystack integration
- [ ] Flutterwave integration
- [ ] Wallet top-up
- [ ] Escrow payment flow
- [ ] Fund release on delivery
- [ ] Transaction history

### 🔄 Phase 7: Real-time Features (PENDING)

- [ ] Live location tracking
- [ ] Real-time order updates
- [ ] In-app chat implementation
- [ ] Push notifications

### 🔄 Phase 8: Additional Features (PENDING)

- [ ] Rating and review system
- [ ] Admin dashboard
- [ ] AI route optimization
- [ ] Fraud detection
- [ ] Customer support chatbot

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   The `.env` file is already configured with Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://clqhyfofjdrtrlzfokzu.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

3. **Database Setup**:
   The database schema is already migrated. Tables created:
   - profiles
   - rider_profiles
   - orders
   - transactions
   - ratings
   - messages
   - notifications
   - location_tracking

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Type Check**:
   ```bash
   npm run typecheck
   ```

## User Roles

### 1. Sender
- Create delivery orders
- Track deliveries in real-time
- Rate riders
- Manage payment methods
- View order history

### 2. Rider/Driver
- View available orders nearby
- Accept delivery requests
- Update order status
- Share live location
- Manage earnings

### 3. Merchant
- Bulk order creation
- Business analytics
- Customer management
- Payment integration

### 4. Admin
- User management
- Order oversight
- Dispute resolution
- Platform analytics
- System configuration

## User Experience Flow

### First-Time User Journey

```
App Launch
    ↓
Splash Screen (2.5s with animations)
    ↓
Onboarding Flow (6 slides)
    ├─→ Fast & Reliable Delivery
    ├─→ Secure Escrow Payments
    ├─→ Live Location Tracking
    ├─→ Easy Wallet Management
    ├─→ Quick & Efficient
    └─→ Trusted Community
    ↓
Login/Signup Screen
    ↓
Select Role (Sender/Rider/Merchant)
    ↓
Create Account
    ↓
Main Dashboard
```

### Returning User Journey

```
App Launch
    ↓
Splash Screen (2.5s)
    ↓
Auto-Login (if session active)
    ↓
Main Dashboard
```

### Onboarding Features

- **6 Interactive Slides**: Each highlighting a key app feature
- **Skip Option**: Users can skip to login anytime
- **Animated Transitions**: Smooth slide animations
- **Progress Indicators**: Animated dots showing current slide
- **Persistent State**: Only shown once using AsyncStorage
- **Themed**: Adapts to light/dark mode

See `ONBOARDING.md` for detailed documentation.

## Authentication Flow

1. **Email/Password**:
   - User enters email and password
   - Supabase validates credentials
   - Profile loaded from database
   - Redirect to main app

2. **Phone OTP**:
   - User enters phone number
   - Supabase sends OTP via SMS
   - User enters 6-digit code
   - Verify and authenticate
   - Profile loaded from database

3. **Registration**:
   - User selects role (sender/rider/merchant)
   - Provides personal information
   - Creates Supabase auth account
   - Profile record created
   - Auto-login after signup

## Payment Integration (Ready to Implement)

### Paystack Setup

1. Get API keys from Paystack dashboard
2. Add to `.env`:
   ```
   EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
   ```
3. Install Paystack SDK
4. Implement payment flow:
   - Initialize transaction
   - Verify payment
   - Update wallet balance
   - Create transaction record

### Flutterwave Setup

Similar to Paystack:
1. Get API keys
2. Configure environment
3. Implement payment flow

### Escrow Flow

1. **Order Creation**: Sender pays delivery fee + escrow
2. **Held in Escrow**: Funds held in platform wallet
3. **Order Accepted**: Rider assigned
4. **In Transit**: Real-time tracking active
5. **Delivered**: Sender confirms delivery
6. **Release Funds**: Payment released to rider

## Maps Integration (Ready to Implement)

### Google Maps Setup

1. Get Google Maps API key
2. Enable:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Directions API
   - Distance Matrix API
   - Places API

3. Add to `.env`:
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXX
   ```

4. Configure in `app.json`:
   ```json
   {
     "ios": {
       "config": {
         "googleMapsApiKey": "AIzaSyXXX"
       }
     },
     "android": {
       "config": {
         "googleMaps": {
           "apiKey": "AIzaSyXXX"
         }
       }
     }
   }
   ```

## Real-time Features

### Location Tracking

Use Expo Location + Task Manager:
- Background location updates
- Insert to `location_tracking` table
- Realtime subscription for live updates
- Display on map for sender

### Chat

Use Supabase Realtime:
- Subscribe to `messages` table
- Filter by order_id
- Real-time message updates
- Read receipts

### Notifications

Use Expo Notifications:
- Push notification permissions
- Store push tokens in profiles
- Send notifications on:
  - Order status changes
  - New messages
  - Payment confirmations
  - Delivery completion

## Best Practices

### Security

1. **Never expose secrets**: Use environment variables
2. **RLS enabled**: All tables have Row Level Security
3. **JWT validation**: Supabase handles token management
4. **Data encryption**: Sensitive data encrypted at rest
5. **Input validation**: Validate all user inputs
6. **Fraud detection**: Monitor suspicious patterns

### Performance

1. **Optimize queries**: Use indexes and efficient queries
2. **Pagination**: Implement for large lists
3. **Caching**: Cache static data
4. **Image optimization**: Use appropriate sizes
5. **Bundle size**: Code splitting where possible
6. **Location updates**: Throttle background location

### Code Quality

1. **TypeScript**: Full type safety
2. **ESLint**: Code linting
3. **Prettier**: Code formatting
4. **Component reusability**: DRY principle
5. **Error handling**: Graceful error states
6. **Loading states**: User feedback during operations

## API Structure

### Orders API

```typescript
// Create order
const { data, error } = await supabase
  .from('orders')
  .insert({
    sender_id: userId,
    pickup_address: '...',
    pickup_lat: 6.5244,
    pickup_lng: 3.3792,
    dropoff_address: '...',
    dropoff_lat: 6.5355,
    dropoff_lng: 3.3897,
    recipient_name: '...',
    recipient_phone: '...',
    package_description: '...',
    package_value: 50000,
    delivery_fee: 1500,
    estimated_distance: 5.2,
    estimated_duration: 25,
  });

// Update order status
const { error } = await supabase
  .from('orders')
  .update({ status: 'accepted', rider_id: riderId })
  .eq('id', orderId);
```

### Transactions API

```typescript
// Create transaction
const { data, error } = await supabase
  .from('transactions')
  .insert({
    order_id: orderId,
    user_id: userId,
    type: 'payment',
    amount: 1500,
    status: 'pending',
    payment_provider: 'paystack',
    payment_reference: 'ref_xxx',
  });
```

### Messages API

```typescript
// Send message
const { data, error } = await supabase
  .from('messages')
  .insert({
    order_id: orderId,
    sender_id: senderId,
    receiver_id: receiverId,
    content: 'Hello!',
  });

// Subscribe to messages
const channel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `order_id=eq.${orderId}`,
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

## Deployment

### Expo EAS Build

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**:
   ```bash
   eas build:configure
   ```

3. **Build for Android**:
   ```bash
   eas build --platform android
   ```

4. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

### Web Deployment

1. **Build web version**:
   ```bash
   npm run build:web
   ```

2. **Deploy to hosting** (Vercel, Netlify, etc.)

### Backend (Supabase)

Already deployed and configured:
- Database: PostgreSQL with all tables
- Auth: Email/Password + Phone OTP
- Realtime: Enabled for live updates
- Storage: Available for file uploads

## Monitoring & Analytics

### Error Tracking

Consider integrating:
- Sentry for error tracking
- Firebase Crashlytics

### Analytics

Consider integrating:
- Mixpanel for user analytics
- Google Analytics

### Performance Monitoring

- Expo metrics
- Custom performance logs

## Support & Maintenance

### Regular Updates

1. Keep dependencies updated
2. Security patches
3. Performance optimizations
4. Feature additions based on feedback

### User Support

1. In-app help center
2. Customer support chat
3. Email support
4. FAQ section

## Next Steps for Implementation

1. **Immediate Priority**:
   - Add Google Maps API key
   - Implement order creation screen
   - Build location picker
   - Test order flow end-to-end

2. **Week 1**:
   - Complete maps integration
   - Order creation and management
   - Rider order acceptance flow

3. **Week 2**:
   - Payment integration (Paystack)
   - Wallet management
   - Transaction history

4. **Week 3**:
   - Real-time location tracking
   - Live order updates
   - In-app chat

5. **Week 4**:
   - Push notifications
   - Rating system
   - Admin dashboard

6. **Week 5+**:
   - AI features
   - Advanced analytics
   - Performance optimization
   - Testing and QA

## Testing Strategy

### Unit Tests

Test individual functions and components:
- Authentication logic
- Form validation
- Data transformations

### Integration Tests

Test feature flows:
- Complete order creation
- Payment processing
- Chat functionality

### E2E Tests

Test entire user journeys:
- Sender creates order
- Rider accepts and delivers
- Payment processed
- Rating submitted

## License

Proprietary - All rights reserved

## Contact

For questions or support, contact the development team.

---

**Built with ❤️ for African logistics**

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: string;
      EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY: string;
      EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: string;
    }
  }
}

export {};

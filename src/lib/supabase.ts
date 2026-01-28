import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore - Vite/ESM standard
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn('Error reading environment variable:', e);
  }
  return undefined;
};

// Credentials with fallback to ensure app functionality
// Using provided fallback keys if env vars are missing to prevent crash/hang

const FALLBACK_URL = '';
const FALLBACK_KEY = '';

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase credentials missing and no fallback available.");
}

// Create the Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://vadwslmqajbbmklrhnzu.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZHdzbG1xYWpiYm1rbHJobnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAxMjIsImV4cCI6MjA4NDYxNjEyMn0.kTxNj1b9kvoRmae5dpR9LnHPYeiSW7R9yhFaQAQydgc';

// Safely access env to prevent "Cannot read properties of undefined"
// We try import.meta.env, then process.env (for some build tools), then empty object.
const env = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env) 
    ? process.env 
    : {};

const supabaseUrl = env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
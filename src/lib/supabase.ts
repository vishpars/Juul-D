import { createClient } from '@supabase/supabase-js';

// Access environment variables. 
// We check both import.meta.env (Vite standard) and process.env (Shimmed in vite.config.ts)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Key is missing. Please check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
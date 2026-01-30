import { createClient } from '@supabase/supabase-js';

// Access environment variables. 
// We check both import.meta.env (Vite standard) and process.env (Shimmed in vite.config.ts)
const supabaseUrl = "https://vadwslmqajbbmklrhnzu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZHdzbG1xYWpiYm1rbHJobnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDAxMjIsImV4cCI6MjA4NDYxNjEyMn0.kTxNj1b9kvoRmae5dpR9LnHPYeiSW7R9yhFaQAQydgc";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Key is missing. Please check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
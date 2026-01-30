import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [react()],
    base: mode === 'production' ? '/Juul-D/' : '/',
    define: {
      // Shim process.env for compatibility with modules relying on it
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      // Also ensure standard process.env usage works for these specific keys
      'process.env': {
         VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
         VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
         ...env
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      fs: {
        strict: false,
      },
    },
  };
});
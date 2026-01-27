
const CACHE_PREFIX = 'juul_d_cache_';
const TIMESTAMP_PREFIX = 'juul_d_time_';

// Default cache duration: 24 hours (since user requested manual updates, we set this high)
// However, the manual refresh button will bypass this.
const DEFAULT_TTL = 24 * 60 * 60 * 1000; 

export const CacheService = {
  get: <T>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(CACHE_PREFIX + key);
      const timestamp = localStorage.getItem(TIMESTAMP_PREFIX + key);
      
      if (!stored || !timestamp) return null;

      // We treat cache as valid indefinitely unless manually refreshed, 
      // or we can enforce a TTL. Let's respect the user's wish for "manual updates" primarily.
      // But purely for safety, let's invalidate if it's > 7 days old.
      const age = Date.now() - parseInt(timestamp, 10);
      if (age > 7 * 24 * 60 * 60 * 1000) {
          CacheService.remove(key);
          return null;
      }

      return JSON.parse(stored) as T;
    } catch (e) {
      console.error("Cache parse error", e);
      return null;
    }
  },

  set: (key: string, data: any) => {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
      localStorage.setItem(TIMESTAMP_PREFIX + key, Date.now().toString());
    } catch (e) {
      console.error("Cache write error (Quota exceeded?)", e);
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(CACHE_PREFIX + key);
    localStorage.removeItem(TIMESTAMP_PREFIX + key);
  },

  clearAll: () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_PREFIX) || k.startsWith(TIMESTAMP_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
};

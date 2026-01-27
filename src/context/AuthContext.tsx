import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  triggerAdminSequence: () => void;
  checkAdminCode: (code: string) => boolean; 
  logoutAdmin: () => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Secret Sequence State
  const [isListeningForCode, setIsListeningForCode] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");

  const SECRET_PASS = "admin123";

  // Check admin role from DB
  const checkProfileRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("[Auth] Failed to fetch profile role. This might be due to missing public.profiles table or RLS policy.", error.message);
        setIsAdmin(false);
        return;
      }
      
      if (data && data.role === 'admin') {
        setIsAdmin(true);
        console.log("[Auth] Admin privileges confirmed via profile.");
      } else {
        setIsAdmin(false);
        console.log(`[Auth] User role is '${data?.role || 'unknown'}'. Admin access denied.`);
      }
    } catch (e) {
      console.error("[Auth] Unexpected error checking profile role:", e);
      setIsAdmin(false);
    }
  };

  const triggerAdminSequence = () => {
    if (isAdmin) return;
    console.log("[System] Identity verification sequence initiated...");
    setIsListeningForCode(true);
    setInputBuffer("");
    
    setTimeout(() => {
      setIsListeningForCode(false);
      setInputBuffer("");
    }, 5000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isListeningForCode) return;

      const newBuffer = inputBuffer + e.key;
      setInputBuffer(newBuffer);

      if (newBuffer.includes(SECRET_PASS)) {
        setIsAdmin(true);
        setIsListeningForCode(false);
        console.log("[System] Admin Access Granted via Override.");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListeningForCode, inputBuffer]);

  const signIn = async (email?: string, password?: string) => {
    setIsLoading(true);
    try {
        if (email && password) {
            // Attempt real Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                // If Auth fails (e.g. wrong password), log specific error
                console.error("Supabase Auth Error:", error.message);
                console.warn("Falling back to demo user due to auth failure. Check console for details.");
                
                // Fallback to Demo User (as requested in original code flow, but now with clearer error log)
                const demoUser = {
                    id: '12345',
                    email: email,
                    role: 'user' as const
                };
                setUser(demoUser);
                setIsAdmin(false); 
            } else if (data.user) {
                // Real User Login Successful
                const realUser = {
                    id: data.user.id,
                    email: data.user.email || '',
                    role: 'user' as const
                };
                // Set User state first
                setUser(realUser);
                // Then await the role check to ensure UI updates correctly
                await checkProfileRole(data.user.id);
            }
        } else {
            // Legacy / Default mock (No credentials provided)
            setUser({
                id: '12345',
                email: 'traveller@vk.com',
                role: 'user'
            });
        }
    } catch (e) {
        console.error("Unexpected Sign-In Error:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const signInAsGuest = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake loading
      setUser({
          id: 'guest',
          email: 'guest@void.net',
          role: 'guest'
      });
      setIsAdmin(false); // Guests are never admins
      setIsLoading(false);
  };

  const signOut = async () => {
    setIsLoading(true);
    setIsAdmin(false);
    await supabase.auth.signOut();
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    setIsLoading(false);
  };

  const checkAdminCode = (code: string) => {
    if (code === SECRET_PASS) {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      isAdmin,
      signIn, 
      signInAsGuest,
      signOut,
      triggerAdminSequence,
      checkAdminCode,
      logoutAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
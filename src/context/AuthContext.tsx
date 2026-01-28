
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import bridge from '@vkontakte/vk-bridge';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signInWithProvider: (provider: 'google') => Promise<void>;
  signInWithVK: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>; 
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  logoutAdmin: () => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Default to true to wait for session check
  
  // Check admin role from DB
  const checkProfileRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.warn("[Auth] Failed to fetch profile role.", error.message);
        setIsAdmin(false);
        return;
      }
      
      if (data && data.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (e) {
      console.error("[Auth] Unexpected error checking profile role:", e);
      setIsAdmin(false);
    }
  };

  // --- Session Initialization Effect ---
  useEffect(() => {
    const initializeAuth = async () => {
        try {
            // 1. Check active Supabase session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                const realUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: 'user'
                };
                setUser(realUser);
                checkProfileRole(session.user.id);
            } else {
                // 2. Check for persisted Guest session
                const isGuest = localStorage.getItem('juul_d_is_guest');
                if (isGuest === 'true') {
                    setUser({
                        id: 'guest',
                        email: 'guest@void.net',
                        role: 'guest'
                    });
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    initializeAuth();

    // 3. Subscribe to Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAdmin(false);
            localStorage.removeItem('juul_d_is_guest');
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
             const realUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                role: 'user'
            };
            // Only update if different to prevent loops, though React handles this
            setUser(realUser);
            localStorage.removeItem('juul_d_is_guest');
            
            if (event === 'SIGNED_IN') {
                checkProfileRole(session.user.id);
            }
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email?: string, password?: string) => {
    setIsLoading(true);
    try {
        if (email && password) {
            // Attempt real Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                console.error("Supabase Auth Error:", error.message);
                throw error;
            }
            
            // Explicitly set user immediately to prevent race conditions with navigation
            if (data.session?.user) {
                const realUser: User = {
                    id: data.session.user.id,
                    email: data.session.user.email || '',
                    role: 'user'
                };
                setUser(realUser);
                await checkProfileRole(data.session.user.id);
            }
        } else {
            // Legacy / Default mock
            setUser({
                id: '12345',
                email: 'traveller@vk.com',
                role: 'user'
            });
        }
    } catch (e) {
        console.error("Sign-In Error:", e);
        throw e; // Rethrow so AuthPage can display error
    } finally {
        setIsLoading(false);
    }
  };

  const signInWithProvider = async (provider: 'google') => {
      setIsLoading(true);
      try {
          // Construct redirect URL to return to the app root (handling subpaths like /Juul-D/)
          let baseUrl = '/';
          try {
              // @ts-ignore
              if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
                  // @ts-ignore
                  baseUrl = import.meta.env.BASE_URL;
              }
          } catch (e) {
              // Ignore env read errors in sandboxes
          }
          
          const redirectUrl = window.location.origin + baseUrl;
          
          const { data, error } = await supabase.auth.signInWithOAuth({
              provider: provider,
              options: {
                  redirectTo: redirectUrl
              }
          });
          if (error) throw error;
      } catch (e) {
          console.error(`OAuth ${provider} Error:`, e);
          throw e;
      } finally {
          // Note: setIsLoading(false) is not called here because OAuth redirects away.
          // It will reset when the page reloads on callback.
      }
  };

  // Custom VK Handler for Mini Apps
  const signInWithVK = async () => {
      setIsLoading(true);
      try {
          // 1. Get VK User Data
          const vkUser = await bridge.send('VKWebAppGetUserInfo');
          if (!vkUser || !vkUser.id) throw new Error("Не удалось получить данные ВК");

          // 2. Generate Synthetic Credentials
          // NOTE: This isn't production-secure for high-stakes apps, but standard for 
          // client-side hobby apps without a backend proxy.
          const fakeEmail = `id${vkUser.id}@vk.juul-d.local`;
          const fakePassword = `vk_secret_${vkUser.id}_secure_salt_v1`;

          // 3. Try to Sign In
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: fakeEmail,
              password: fakePassword
          });

          // 4. If Sign In fails (User doesn't exist), Sign Up
          if (signInError) {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                  email: fakeEmail,
                  password: fakePassword,
              });

              if (signUpError) throw signUpError;

              // 5. Update Profile with VK Name/Avatar (Wait for session trigger or force update)
              if (signUpData.user) {
                  // Small delay to ensure triggers ran if any, then upsert
                  await new Promise(r => setTimeout(r, 500));
                  await supabase.from('profiles').upsert({
                      id: signUpData.user.id,
                      full_name: `${vkUser.first_name} ${vkUser.last_name}`,
                      avatar_url: vkUser.photo_200 || vkUser.photo_100,
                      updated_at: new Date()
                  });
              }
          }
      } catch (e: any) {
          console.error("VK Auth Error:", e);
          throw e;
      } finally {
          setIsLoading(false);
      }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("Supabase Registration Error:", error.message);
        throw error;
      }
      
      if (!data.session && data.user) {
          console.log("Registration successful, verify email.");
      }
    } catch (e) {
      console.error("Registration Exception:", e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsGuest = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake loading
      
      localStorage.setItem('juul_d_is_guest', 'true');
      
      setUser({
          id: 'guest',
          email: 'guest@void.net',
          role: 'guest'
      });
      setIsAdmin(false); 
      setIsLoading(false);
  };

  const signOut = async () => {
    setIsLoading(true);
    setIsAdmin(false);
    localStorage.removeItem('juul_d_is_guest');
    
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
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
      signInWithProvider,
      signInWithVK,
      signUp,
      signInAsGuest,
      signOut,
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

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  checkAdminCode: (code: string) => boolean;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persisted admin session
    const storedAdmin = localStorage.getItem('isAdmin');
    if (storedAdmin === 'true') {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const checkAdminCode = (code: string) => {
    // Hardcoded secret for demo purposes
    const SECRET = "admin123"; 
    if (code === SECRET) {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, checkAdminCode, logoutAdmin }}>
      {!loading && children}
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
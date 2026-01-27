
// [DIALECT] - This whole file is part of the dialect module
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DIALECT_DICT } from './dictionary';
import { Faction } from '../types';

interface DialectContextType {
  isOldSlavonic: boolean;
  isDialectUnlocked: boolean;
  isBloodMode: boolean;
  isToggleVisible: boolean;
  toggleDialect: () => void;
  handleSlashClick: () => void;
  handleLetterClick: (char: string) => void;
  isInputMode: boolean;
  inputBuffer: string;
  t: (key: string, defaultText: string) => string;
  trackTabChange: (faction: Faction) => void;
}

const DialectContext = createContext<DialectContextType | undefined>(undefined);

export const DialectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOldSlavonic, setIsOldSlavonic] = useState(false);
  const [isDialectUnlocked, setIsDialectUnlocked] = useState(false);
  const [isBloodMode, setIsBloodMode] = useState(false);
  
  // New state: Is the scroll button visible?
  const [isToggleVisible, setIsToggleVisible] = useState(false);
  
  // Easter Egg State
  const [slashClickCount, setSlashClickCount] = useState(0);
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputBuffer, setInputBuffer] = useState("");
  
  // Global Keyboard Buffer for "rak-kubov"
  const [globalKeyBuffer, setGlobalKeyBuffer] = useState("");
  
  const SLAVONIC_CODE = "пишет//дед";
  const BLOOD_CODE = "тело//и//плоть";
  const TOGGLE_UNLOCK_CODE = "рак-кубов";
  const CLICKS_REQUIRED = 15;

  useEffect(() => {
    // Load persisted states
    const savedDialect = localStorage.getItem('isOldSlavonic') === 'true';
    const savedUnlock = localStorage.getItem('isDialectUnlocked') === 'true';
    const savedBlood = localStorage.getItem('isBloodMode') === 'true';
    const savedVisible = localStorage.getItem('isToggleVisible') === 'true';
    
    setIsOldSlavonic(savedDialect);
    setIsDialectUnlocked(savedUnlock);
    setIsBloodMode(savedBlood);
    setIsToggleVisible(savedVisible);
  }, []);

  // Global Key Listener for "rak-kubov" unlock
  useEffect(() => {
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
          if (isToggleVisible) return;

          setGlobalKeyBuffer(prev => {
              const next = (prev + e.key.toLowerCase()).slice(-20);
              
              if (next.includes(TOGGLE_UNLOCK_CODE)) {
                  setIsToggleVisible(true);
                  localStorage.setItem('isToggleVisible', 'true');
                  console.log("Dialect Toggle Button Unlocked!");
              }
              return next;
          });
      };

      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isToggleVisible]);

  const unlockDialect = () => {
    setIsDialectUnlocked(true);
    localStorage.setItem('isDialectUnlocked', 'true');
    setIsInputMode(false);
    setInputBuffer("");
    console.log("Dialect Unlocked!");
  };

  const activateBloodMode = () => {
      const newState = !isBloodMode;
      setIsBloodMode(newState);
      localStorage.setItem('isBloodMode', String(newState));
      setIsInputMode(false);
      setInputBuffer("");
  };

  const handleSlashClick = () => {
    // Allows entering codes even if unlocked (e.g. for blood mode)
    if (!isInputMode) {
      const newCount = slashClickCount + 1;
      setSlashClickCount(newCount);
      if (newCount >= CLICKS_REQUIRED) {
        setIsInputMode(true);
        setInputBuffer("");
      }
    } else {
      handleLetterClick("//");
    }
  };

  const handleLetterClick = (char: string) => {
    if (!isInputMode) return;

    setInputBuffer(prev => {
      const next = (prev + char.toLowerCase()).slice(-20);
      
      if (next.includes(SLAVONIC_CODE)) {
         unlockDialect();
      }
      if (next.includes(BLOOD_CODE)) {
         activateBloodMode();
      }
      return next;
    });
  };

  const toggleDialect = () => {
    setIsOldSlavonic(prev => {
      const next = !prev;
      localStorage.setItem('isOldSlavonic', String(next));
      return next;
    });
  };

  const t = (key: string, defaultText: string) => {
    if (!isOldSlavonic) return defaultText;
    return DIALECT_DICT[key] || defaultText;
  };

  const trackTabChange = (faction: Faction) => {
      // Deprecated functionality, kept empty for interface compatibility if needed, 
      // but logic moved to keyboard input.
  };

  return (
    <DialectContext.Provider value={{ 
      isOldSlavonic, 
      isDialectUnlocked, 
      isBloodMode,
      isToggleVisible,
      toggleDialect, 
      handleSlashClick, 
      handleLetterClick, 
      isInputMode,
      inputBuffer,
      t,
      trackTabChange
    }}>
      {children}
    </DialectContext.Provider>
  );
};

export const useDialect = () => {
  const context = useContext(DialectContext);
  if (!context) {
    return { 
      isOldSlavonic: false, 
      isDialectUnlocked: false, 
      isBloodMode: false,
      isToggleVisible: false,
      toggleDialect: () => {}, 
      handleSlashClick: () => {},
      handleLetterClick: () => {},
      isInputMode: false,
      inputBuffer: "",
      t: (_: string, d: string) => d,
      trackTabChange: () => {}
    };
  }
  return context;
};

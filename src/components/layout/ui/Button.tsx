import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 font-fantasy tracking-widest text-sm uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed clip-path-polygon";
  
  const variants = {
    primary: "bg-slate-900 border border-violet-500/50 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:bg-slate-800 hover:text-white",
    secondary: "bg-slate-800/50 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-violet-200",
    danger: "bg-red-900/20 border border-red-900/50 text-red-200 hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};
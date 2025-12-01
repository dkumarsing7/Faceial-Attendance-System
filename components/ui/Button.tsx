import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500 shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500 border border-slate-600",
    danger: "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 shadow-lg shadow-emerald-500/20"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
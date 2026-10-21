import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md'
}) => {
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-900 border border-blue-200',
    success: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-900 border border-amber-200',
    danger: 'bg-rose-100 text-rose-900 border border-rose-200',
    neutral: 'bg-slate-100 text-slate-800 border border-slate-200',
    info: 'bg-cyan-100 text-cyan-900 border border-cyan-200'
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-xs font-medium px-2.5 py-1 rounded-md'
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
};

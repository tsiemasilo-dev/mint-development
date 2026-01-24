import React from 'react';

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-600',
  destructive: 'bg-rose-100 text-rose-600',
  default: 'bg-slate-100 text-slate-600',
};

const appearanceStyles = {
  light: '',
};

const Badge = ({ variant = 'default', appearance = 'light', className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${variantStyles[variant] || variantStyles.default} ${appearanceStyles[appearance] || ''} ${className}`.trim()}
  >
    {children}
  </span>
);

export { Badge };

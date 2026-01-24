import React from 'react';

const Card = ({ className = '', children }) => (
  <div className={`rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 ${className}`.trim()}>
    {children}
  </div>
);

const CardHeader = ({ className = '', children }) => (
  <div className={`flex items-center justify-between px-5 ${className}`.trim()}>
    {children}
  </div>
);

const CardTitle = ({ className = '', children }) => (
  <h2 className={`text-sm font-semibold text-slate-900 ${className}`.trim()}>{children}</h2>
);

const CardToolbar = ({ className = '', children }) => (
  <div className={`flex items-center gap-2 ${className}`.trim()}>{children}</div>
);

const CardContent = ({ className = '', children }) => (
  <div className={`px-5 pb-5 ${className}`.trim()}>{children}</div>
);

export { Card, CardContent, CardHeader, CardTitle, CardToolbar };

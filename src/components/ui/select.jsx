import React, { createContext, useContext, useState } from 'react';

const SelectContext = createContext(null);

const Select = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = ({ children }) => {
  const ctx = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
    >
      {children}
    </button>
  );
};

const SelectContent = ({ align = 'start', children }) => {
  const ctx = useContext(SelectContext);

  if (!ctx.open) {
    return null;
  }

  return (
    <div
      className={`absolute z-10 mt-2 min-w-[160px] rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-md ${
        align === 'end' ? 'right-0' : 'left-0'
      }`}
    >
      {children}
    </div>
  );
};

const SelectItem = ({ value, children }) => {
  const ctx = useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => {
        ctx.onValueChange(value);
        ctx.setOpen(false);
      }}
      className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium ${
        ctx.value === value ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
      }`}
    >
      {children}
    </button>
  );
};

export { Select, SelectContent, SelectItem, SelectTrigger };

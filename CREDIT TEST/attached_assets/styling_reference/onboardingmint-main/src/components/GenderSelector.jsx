import React from "react";

const GenderSelector = ({ value, onChange }) => {
  const options = [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`flex-1 rounded-xl border py-3 text-center text-base font-semibold transition active:scale-[0.98] ${
            value === option.id
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default GenderSelector;

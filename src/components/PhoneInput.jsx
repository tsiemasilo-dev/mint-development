import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const countries = [
  { code: "+27", name: "South Africa", flag: "🇿🇦", format: "XX XXX XXXX" },
  { code: "+1", name: "United States", flag: "🇺🇸", format: "(XXX) XXX-XXXX" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", format: "XXXX XXXXXX" },
  { code: "+61", name: "Australia", flag: "🇦🇺", format: "XXX XXX XXX" },
  { code: "+91", name: "India", flag: "🇮🇳", format: "XXXXX XXXXX" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬", format: "XXX XXX XXXX" },
  { code: "+254", name: "Kenya", flag: "🇰🇪", format: "XXX XXXXXX" },
  { code: "+971", name: "UAE", flag: "🇦🇪", format: "XX XXX XXXX" },
  { code: "+49", name: "Germany", flag: "🇩🇪", format: "XXX XXXXXXXX" },
  { code: "+33", name: "France", flag: "🇫🇷", format: "X XX XX XX XX" },
];

const formatSouthAfricanNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
};

const formatUSNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const formatGenericNumber = (value) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
};

const formatNumber = (value, countryCode) => {
  switch (countryCode) {
    case "+27":
      return formatSouthAfricanNumber(value);
    case "+1":
      return formatUSNumber(value);
    default:
      return formatGenericNumber(value);
  }
};

const parsePhoneValue = (fullValue) => {
  if (!fullValue) return { countryCode: "+27", number: "" };
  
  for (const country of countries) {
    if (fullValue.startsWith(country.code)) {
      return {
        countryCode: country.code,
        number: fullValue.slice(country.code.length).trim(),
      };
    }
  }
  
  return { countryCode: "+27", number: fullValue };
};

const PhoneInput = ({ value, onChange, placeholder = "Phone number" }) => {
  const parsed = parsePhoneValue(value);
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === parsed.countryCode) || countries[0]
  );
  const [localNumber, setLocalNumber] = useState(parsed.number);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const parsed = parsePhoneValue(value);
    const country = countries.find((c) => c.code === parsed.countryCode) || countries[0];
    setSelectedCountry(country);
    setLocalNumber(parsed.number);
  }, [value]);

  const handleNumberChange = (e) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 10);
    const formatted = formatNumber(digitsOnly, selectedCountry.code);
    setLocalNumber(formatted);
    onChange(`${selectedCountry.code} ${formatted}`.trim());
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowDropdown(false);
    const digitsOnly = localNumber.replace(/\D/g, "");
    const formatted = formatNumber(digitsOnly, country.code);
    setLocalNumber(formatted);
    onChange(`${country.code} ${formatted}`.trim());
  };

  return (
    <div className="relative flex gap-2">
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex h-full min-w-[100px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900"
        >
          <span className="flex items-center gap-2">
            <span className="text-base">{selectedCountry.flag}</span>
            <span>{selectedCountry.code}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  selectedCountry.code === country.code ? "bg-slate-50" : ""
                }`}
              >
                <span className="text-base">{country.flag}</span>
                <span className="flex-1 text-sm font-medium text-slate-900">{country.name}</span>
                <span className="text-sm text-slate-500">{country.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
      />
    </div>
  );
};

export default PhoneInput;

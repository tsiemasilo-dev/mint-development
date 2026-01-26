import React, { useState, useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";

const generateAddressSuggestions = (query) => {
  if (!query || query.length < 2) return [];
  
  const streetTypes = ["Road", "Street", "Avenue", "Drive", "Lane", "Way", "Close", "Crescent"];
  const suburbs = [
    { name: "Sandton", city: "Johannesburg" },
    { name: "Rosebank", city: "Johannesburg" },
    { name: "Randburg", city: "Johannesburg" },
    { name: "Fourways", city: "Johannesburg" },
    { name: "Midrand", city: "Johannesburg" },
    { name: "Bryanston", city: "Johannesburg" },
    { name: "Parktown", city: "Johannesburg" },
    { name: "Melville", city: "Johannesburg" },
    { name: "Castleview", city: "Germiston" },
    { name: "Primrose", city: "Germiston" },
    { name: "Bedfordview", city: "Germiston" },
    { name: "Centurion", city: "Pretoria" },
    { name: "Brooklyn", city: "Pretoria" },
    { name: "Hatfield", city: "Pretoria" },
    { name: "Waterkloof", city: "Pretoria" },
    { name: "Sea Point", city: "Cape Town" },
    { name: "Green Point", city: "Cape Town" },
    { name: "Gardens", city: "Cape Town" },
    { name: "Claremont", city: "Cape Town" },
    { name: "Constantia", city: "Cape Town" },
    { name: "Umhlanga", city: "Durban" },
    { name: "Morningside", city: "Durban" },
    { name: "Berea", city: "Durban" },
    { name: "Westville", city: "Durban" },
    { name: "Summerstrand", city: "Port Elizabeth" },
    { name: "Walmer", city: "Port Elizabeth" },
  ];
  
  const streetNames = [
    "Main", "Church", "Market", "Victoria", "Nelson Mandela", "Long", "Oxford",
    "Jan Smuts", "William Nicol", "Rivonia", "Sandton", "Pretoria", "Beyers Naude",
    "Hendrik Verwoerd", "Paul Kruger", "Voortrekker", "Commissioner", "Fox", "Juta",
    "Louis Botha", "Empire", "Barry Hertzog", "Republic", "Strand", "Adderley",
    "Kloof", "Loop", "Bree", "Rissik", "Eloff", "President", "Smith", "West",
    "North", "South", "East", "High", "Park", "Lake", "River", "Hill", "Valley",
    "Mountain", "Forest", "Garden", "Rose", "Palm", "Oak", "Pine", "Cedar",
    "Deimos", "Apollo", "Saturn", "Jupiter", "Mars", "Venus", "Mercury",
  ];

  const suggestions = [];
  const queryLower = query.toLowerCase().trim();
  const parts = queryLower.split(/\s+/);
  const hasNumber = /^\d+/.test(queryLower);
  const numberMatch = queryLower.match(/^(\d+)/);
  const streetNumber = numberMatch ? numberMatch[1] : Math.floor(Math.random() * 200) + 1;
  
  const searchTerms = hasNumber ? parts.slice(1).join(" ") : queryLower;
  
  for (const streetName of streetNames) {
    if (streetName.toLowerCase().includes(searchTerms) || searchTerms.includes(streetName.toLowerCase())) {
      for (const streetType of streetTypes.slice(0, 3)) {
        for (const suburb of suburbs.slice(0, 8)) {
          const address = `${streetNumber} ${streetName} ${streetType}, ${suburb.name}, ${suburb.city}, South Africa`;
          if (address.toLowerCase().includes(searchTerms)) {
            suggestions.push(address);
          }
          if (suggestions.length >= 5) break;
        }
        if (suggestions.length >= 5) break;
      }
      if (suggestions.length >= 5) break;
    }
  }
  
  if (suggestions.length === 0 && searchTerms.length >= 2) {
    const capitalizedQuery = searchTerms.split(" ").map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(" ");
    
    for (let i = 0; i < Math.min(5, suburbs.length); i++) {
      const suburb = suburbs[i];
      const streetType = streetTypes[i % streetTypes.length];
      suggestions.push(`${streetNumber} ${capitalizedQuery} ${streetType}, ${suburb.name}, ${suburb.city}, South Africa`);
    }
  }
  
  return suggestions.slice(0, 5);
};

const AddressAutocomplete = ({ value, onChange, placeholder = "Search address" }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);

    if (inputValue.length >= 2) {
      const generated = generateAddressSuggestions(inputValue);
      setSuggestions(generated);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (address) => {
    setQuery(address);
    onChange(address);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (query.length >= 2) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((address, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(address)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="text-sm text-slate-700">{address}</span>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-slate-500">No addresses found</p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;

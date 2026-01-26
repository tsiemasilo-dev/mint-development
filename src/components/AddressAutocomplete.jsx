import React, { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

const AddressAutocomplete = ({ value, onChange, placeholder = "Search address" }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddresses = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=8&lat=-28.4793&lon=24.6727`,
        {
          headers: {
            "Accept-Language": "en",
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      const addresses = data.features.map((item) => {
        const props = item.properties;
        const parts = [];
        if (props.housenumber) parts.push(props.housenumber);
        if (props.street) parts.push(props.street);
        if (props.district) parts.push(props.district);
        if (props.city) parts.push(props.city);
        if (props.state) parts.push(props.state);
        if (props.country) parts.push(props.country);
        
        return {
          displayName: parts.length > 0 ? parts.join(", ") : props.name,
          country: props.country,
          lat: item.geometry?.coordinates?.[1],
          lon: item.geometry?.coordinates?.[0],
        };
      });

      const sorted = addresses.sort((a, b) => {
        const aIsSA = a.country?.toLowerCase() === "south africa";
        const bIsSA = b.country?.toLowerCase() === "south africa";
        if (aIsSA && !bIsSA) return -1;
        if (!aIsSA && bIsSA) return 1;
        return 0;
      });

      setSuggestions(sorted.slice(0, 6));
      setShowSuggestions(true);
    } catch (error) {
      console.error("Address search error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(inputValue);
    }, 150);
  };

  const handleSelect = (address) => {
    setQuery(address.displayName);
    onChange(address.displayName);
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
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((address, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(address)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="text-sm text-slate-700">{address.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && !isLoading && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-slate-500">No addresses found</p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;

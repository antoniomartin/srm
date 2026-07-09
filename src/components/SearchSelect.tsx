import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  disabled = false,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search input text with selected value on change or initialization
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedOption ? selectedOption.label : '');
    }
  }, [value, selectedOption, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter options dynamically
  const filteredOptions = options.filter((opt) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query || selectedOption?.label === searchQuery) return true;
    return (
      opt.label.toLowerCase().includes(query) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
    );
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`flex items-center justify-between bg-slate-50 border rounded-lg px-3 py-2 text-sm focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'bg-white border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            if (selectedOption && searchQuery === selectedOption.label) {
              setSearchQuery(''); // Clear query to show all options on focus click
            }
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={selectedOption ? selectedOption.label : placeholder}
            value={searchQuery}
            disabled={disabled}
            required={required && !value}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (selectedOption && searchQuery === selectedOption.label) {
                setSearchQuery('');
              }
              setIsOpen(true);
            }}
            className="w-full bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 p-0 text-sm focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 text-center">
              No se encontraron coincidencias
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`px-3 py-2 text-xs sm:text-sm cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="truncate font-medium">{opt.label}</p>
                  {opt.sublabel && (
                    <p className={`truncate text-[10px] sm:text-[11px] mt-0.5 ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {opt.sublabel}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

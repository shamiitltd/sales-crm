import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  label = null,
  required = false,
  error = null,
  disabled = false,
  buttonClassName = '',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button with standardized 48px height */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-[48px] px-3.5 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between text-left outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
        } text-slate-900 dark:text-slate-100 shadow-xs ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {selectedOption ? (
            <>
              {selectedOption.dotColor && (
                <span className={`w-2 h-2 rounded-full ${selectedOption.dotColor} shrink-0`} />
              )}
              {selectedOption.badgeClass ? (
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold truncate ${selectedOption.badgeClass}`}>
                  {selectedOption.label}
                </span>
              ) : (
                <span className="truncate whitespace-nowrap">{selectedOption.label}</span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {/* Floating Options Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[180px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-xs sm:text-sm text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dotColor && (
                    <span className={`w-2 h-2 rounded-full ${opt.dotColor} shrink-0`} />
                  )}
                  {opt.badgeClass ? (
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${opt.badgeClass}`}>
                      {opt.label}
                    </span>
                  ) : (
                    <span className="truncate">{opt.label}</span>
                  )}
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

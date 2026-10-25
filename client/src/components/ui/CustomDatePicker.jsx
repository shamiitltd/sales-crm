import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function toIsoString(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function CustomDatePicker({
  value,
  onChange,
  label = null,
  required = false,
  error = null,
  disabled = false,
  minDate = null,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Initialize view date from value or today
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

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

  // When value changes from outside, sync view month/year
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Quick preset dates
  const handleQuickPreset = (daysToAdd) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const iso = toIsoString(target.getFullYear(), target.getMonth(), target.getDate());
    if (minDate && iso < minDate) return;
    onChange(iso);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Control (Height matching standard inputs: 48px) */}
      <div
        className={`w-full h-[48px] rounded-lg border text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between outline-none shadow-xs ${
          error
            ? 'border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 dark:border-red-500'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
        } text-slate-900 dark:text-slate-100`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-1 h-full px-3.5 flex items-center gap-2.5 truncate text-left cursor-pointer outline-none focus:outline-none min-w-0"
        >
          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {value ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {formatDisplayDate(value)}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">Select follow-up date...</span>
          )}
        </button>

        {/* Compact Secondary "Today" Shortcut Button */}
        <div className="pr-2.5 flex items-center shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleQuickPreset(0);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition cursor-pointer ${
              value === todayIso
                ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Set to Today"
          >
            Today
          </button>
        </div>
      </div>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 right-0 sm:left-0 sm:right-auto w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition shrink-0 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(1)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition shrink-0 cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(3)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition shrink-0 cursor-pointer"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(7)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 transition shrink-0 cursor-pointer"
            >
              +1 Wk
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Previous month trailing days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const day = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 dark:text-slate-700 select-none"
                >
                  {day}
                </span>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateStr = toIsoString(viewYear, viewMonth, d);
              const isSelected = value === dateStr;
              const isToday = dateStr === todayIso;
              const isPast = minDate && dateStr < minDate;

              return (
                <button
                  key={d}
                  type="button"
                  disabled={isPast || disabled}
                  onClick={() => {
                    if (isPast) return;
                    onChange(dateStr);
                    setIsOpen(false);
                  }}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                    isPast
                      ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600 line-through'
                      : isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 cursor-pointer'
                      : isToday
                      ? 'border border-blue-500 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
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

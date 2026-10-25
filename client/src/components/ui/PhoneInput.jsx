import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import {
  COUNTRIES,
  parsePhoneNumber,
  validateE164Phone
} from '../../utils/validators';

/**
 * Professional E.164 International Phone Input Component
 * Features:
 * - Compact country code area (w-[84px] on mobile, w-[88px] on desktop)
 * - Wide national number entry field taking all remaining width
 * - Unified 48px container with subtle vertical divider
 * - Auto-formatting national number (e.g. 98201 54321)
 * - Strict E.164 compliance and numerical-only enforcement
 */
export default function PhoneInput({
  value = '',
  onChange,
  onBlur,
  error = null,
  touched = false,
  required = true,
  disabled = false,
  id = 'contact_number',
  name = 'contact_number',
  className = ''
}) {
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN');
  const [nationalNumber, setNationalNumber] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const isInternalChange = useRef(false);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const parsed = parsePhoneNumber(value, selectedCountryCode);
    setSelectedCountryCode(parsed.country.code);
    setNationalNumber(parsed.nationalNumber);
    setDisplayValue(parsed.formattedNumber);
  }, [value, selectedCountryCode]);

  const currentCountry =
    COUNTRIES.find((c) => c.code === selectedCountryCode) ||
    COUNTRIES.find((c) => c.code === 'IN') ||
    COUNTRIES[0];

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    const newCountry = COUNTRIES.find((c) => c.code === newCode) || COUNTRIES[0];
    setSelectedCountryCode(newCode);

    // Limit digits to new country's maximum length
    const limitedDigits = nationalNumber.slice(0, newCountry.maxLength);
    setNationalNumber(limitedDigits);
    const formatted = newCountry.format ? newCountry.format(limitedDigits) : limitedDigits;
    setDisplayValue(formatted);

    const e164 = limitedDigits ? `${newCountry.dialCode}${limitedDigits}` : '';
    const validation = validateE164Phone(e164, { countryCode: newCountry.code, required });

    isInternalChange.current = true;
    if (onChange) {
      onChange(e164, validation);
    }
  };

  const handleNumberChange = (e) => {
    // Strictly block non-numeric characters (0-9 only)
    const rawDigits = e.target.value.replace(/\D/g, '');

    // Limit to country maximum length
    const limitedDigits = rawDigits.slice(0, currentCountry.maxLength);
    setNationalNumber(limitedDigits);

    // Auto-format for display
    const formatted = currentCountry.format ? currentCountry.format(limitedDigits) : limitedDigits;
    setDisplayValue(formatted);

    // Build standard E.164 string (e.g. +919820154321)
    const e164 = limitedDigits ? `${currentCountry.dialCode}${limitedDigits}` : '';
    const validation = validateE164Phone(e164, { countryCode: currentCountry.code, required });

    isInternalChange.current = true;
    if (onChange) {
      onChange(e164, validation);
    }
  };

  const isValid = validateE164Phone(
    nationalNumber ? `${currentCountry.dialCode}${nationalNumber}` : '',
    { countryCode: currentCountry.code, required }
  ).isValid;

  return (
    <div className={`relative ${className}`}>
      {/* Unified 48px Input Container */}
      <div
        className={`flex items-center h-[48px] min-h-[48px] rounded-lg border transition-all duration-150 shadow-xs overflow-hidden ${
          error
            ? 'border-red-500 dark:border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 bg-white dark:bg-slate-900'
            : touched && isValid
            ? 'border-emerald-500/70 dark:border-emerald-500/60 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}
      >
        {/* Compact Country Code Trigger (Quite small ~84px) with Subtle Divider */}
        <div className="relative flex items-center shrink-0 h-full w-[84px] sm:w-[88px] border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          {/* Visible compact label showing ONLY flag + dial code, e.g. 🇮🇳 +91 */}
          <div className="flex items-center justify-between w-full px-2.5 pointer-events-none select-none">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {currentCountry.flag} {currentCountry.dialCode}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-0.5" />
          </div>

          {/* Full overlay select for accessible native picker with complete country names */}
          <select
            value={currentCountry.code}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Country calling code"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed text-xs"
          >
            {COUNTRIES.map((c) => (
              <option
                key={c.code}
                value={c.code}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5"
              >
                {c.flag} {c.dialCode} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* National Number Numeric-Only Input: Takes ALL the remaining wide space */}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          id={id}
          name={name}
          disabled={disabled}
          value={displayValue}
          onChange={handleNumberChange}
          onBlur={onBlur}
          placeholder={currentCountry.placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-full flex-1 min-w-0 bg-transparent px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium focus:outline-none disabled:opacity-50"
        />

        {/* Real-time Valid Indicator on far right */}
        {touched && isValid && (
          <div className="pr-3 text-emerald-500 shrink-0 pointer-events-none">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Inline Validation Error Message (Unified formatting) */}
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

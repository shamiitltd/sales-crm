/**
 * Enterprise Form Validators & Sanitizers
 * Standards: ITU-T E.164 (International Telephony), RFC 5322 (Email), Indian Rupee Formatting
 */

export const COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9]\d{9}$/,
    format: (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5, 10)}` : d),
    placeholder: '98201 54321',
    errorMessage: 'Please enter a valid 10-digit mobile number'
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    format: (d) => {
      if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
      if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}`;
      return d;
    },
    placeholder: '(555) 012-3456',
    errorMessage: 'Please enter a valid 10-digit phone number'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    minLength: 10,
    maxLength: 10,
    pattern: /^\d{10}$/,
    format: (d) => (d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4, 10)}` : d),
    placeholder: '7911 123456',
    errorMessage: 'Please enter a valid 10-digit UK phone number'
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    format: (d) => (d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}` : d),
    placeholder: '50 123 4567',
    errorMessage: 'Please enter a valid 9-digit UAE mobile number'
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    minLength: 8,
    maxLength: 8,
    pattern: /^[89]\d{7}$/,
    format: (d) => (d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4, 8)}` : d),
    placeholder: '8123 4567',
    errorMessage: 'Please enter a valid 8-digit Singapore phone number'
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    minLength: 9,
    maxLength: 9,
    pattern: /^4\d{8}$/,
    format: (d) => (d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}` : d),
    placeholder: '412 345 678',
    errorMessage: 'Please enter a valid 9-digit Australian mobile number'
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    format: (d) => {
      if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
      if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}`;
      return d;
    },
    placeholder: '(416) 555-0199',
    errorMessage: 'Please enter a valid 10-digit Canadian phone number'
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    minLength: 10,
    maxLength: 11,
    pattern: /^\d{10,11}$/,
    format: (d) => (d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d),
    placeholder: '151 23456789',
    errorMessage: 'Please enter a valid German phone number'
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '🇸🇦',
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    format: (d) => (d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 9)}` : d),
    placeholder: '50 123 4567',
    errorMessage: 'Please enter a valid 9-digit Saudi mobile number'
  },
  {
    code: 'QA',
    name: 'Qatar',
    dialCode: '+974',
    flag: '🇶🇦',
    minLength: 8,
    maxLength: 8,
    pattern: /^[3567]\d{7}$/,
    format: (d) => (d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4, 8)}` : d),
    placeholder: '3312 3456',
    errorMessage: 'Please enter a valid 8-digit Qatar mobile number'
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    flag: '🇫🇷',
    minLength: 9,
    maxLength: 9,
    pattern: /^[67]\d{8}$/,
    format: (d) => (d.length > 1 ? `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}` : d),
    placeholder: '6 12 34 56 78',
    errorMessage: 'Please enter a valid French mobile number'
  },
  {
    code: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    flag: '🇲🇾',
    minLength: 9,
    maxLength: 10,
    pattern: /^1\d{8,9}$/,
    format: (d) => (d.length > 2 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : d),
    placeholder: '12 345 6789',
    errorMessage: 'Please enter a valid Malaysian mobile number'
  },
  {
    code: 'OTHER',
    name: 'Other',
    dialCode: '+',
    flag: '🌐',
    minLength: 7,
    maxLength: 15,
    pattern: /^\d{7,15}$/,
    format: (d) => d,
    placeholder: 'Phone number',
    errorMessage: 'Please enter a valid phone number (7 to 15 digits)'
  }
];

/**
 * Parses any phone string into structured parts: country, national digits, formatted string, and E.164.
 */
export function parsePhoneNumber(rawPhone, defaultCountryCode = 'IN') {
  const defaultCountry = COUNTRIES.find((c) => c.code === defaultCountryCode) || COUNTRIES[0];

  if (!rawPhone || !String(rawPhone).trim()) {
    return {
      country: defaultCountry,
      nationalNumber: '',
      formattedNumber: '',
      e164: ''
    };
  }

  const str = String(rawPhone).trim();
  const digitsOnly = str.replace(/\D/g, '');

  // If the number explicitly has a leading '+'
  if (str.startsWith('+')) {
    // Check known countries sorted by dialCode length descending (e.g. +971 before +9)
    const sortedCountries = [...COUNTRIES]
      .filter((c) => c.dialCode !== '+')
      .sort((a, b) => b.dialCode.length - a.dialCode.length);

    for (const c of sortedCountries) {
      if (str.startsWith(c.dialCode)) {
        const national = str.slice(c.dialCode.length).replace(/\D/g, '').slice(0, c.maxLength);
        return {
          country: c,
          nationalNumber: national,
          formattedNumber: c.format ? c.format(national) : national,
          e164: national ? `${c.dialCode}${national}` : ''
        };
      }
    }
  }

  // If no country dial code prefix, associate with default country (India)
  const national = digitsOnly.slice(0, defaultCountry.maxLength);
  return {
    country: defaultCountry,
    nationalNumber: national,
    formattedNumber: defaultCountry.format ? defaultCountry.format(national) : national,
    e164: national ? `${defaultCountry.dialCode}${national}` : ''
  };
}

/**
 * Validates a phone number against strict E.164 and country rules:
 * - India (+91): Exactly 10 digits, starts with 6, 7, 8, or 9
 * - Strips whitespace, hyphens, and parentheses
 */
export function validateE164Phone(phoneOrE164, { countryCode = 'IN', required = true } = {}) {
  const str = phoneOrE164 ? String(phoneOrE164).trim() : '';

  if (!str) {
    return {
      isValid: !required,
      error: required ? 'Please enter a valid 10-digit mobile number' : '',
      e164: ''
    };
  }

  // Match country by countryCode or leading dial code
  const country =
    COUNTRIES.find((c) => c.code === countryCode) ||
    COUNTRIES.find((c) => c.dialCode !== '+' && str.startsWith(c.dialCode)) ||
    COUNTRIES[0];

  // Extract pure national digits
  const nationalDigits =
    country.dialCode !== '+' && str.startsWith(country.dialCode)
      ? str.slice(country.dialCode.length).replace(/\D/g, '')
      : str.replace(/\D/g, '');

  if (!nationalDigits) {
    return {
      isValid: !required,
      error: required ? 'Please enter a valid 10-digit mobile number' : '',
      e164: ''
    };
  }

  // Strict India (+91) validation
  if (country.code === 'IN') {
    if (nationalDigits.length !== 10) {
      return {
        isValid: false,
        error: 'Please enter a valid 10-digit mobile number',
        e164: `${country.dialCode}${nationalDigits}`
      };
    }
    if (!/^[6-9]\d{9}$/.test(nationalDigits)) {
      return {
        isValid: false,
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9.',
        e164: `${country.dialCode}${nationalDigits}`
      };
    }
  } else if (country.minLength === country.maxLength && nationalDigits.length !== country.minLength) {
    return {
      isValid: false,
      error: country.errorMessage || `Please enter a valid ${country.minLength}-digit phone number`,
      e164: `${country.dialCode}${nationalDigits}`
    };
  } else if (nationalDigits.length < country.minLength || nationalDigits.length > country.maxLength) {
    return {
      isValid: false,
      error: country.errorMessage || `Phone number must be between ${country.minLength} and ${country.maxLength} digits`,
      e164: `${country.dialCode}${nationalDigits}`
    };
  } else if (country.pattern && !country.pattern.test(nationalDigits)) {
    return {
      isValid: false,
      error: country.errorMessage || 'Please enter a valid phone number',
      e164: `${country.dialCode}${nationalDigits}`
    };
  }

  return {
    isValid: true,
    error: '',
    e164: `${country.dialCode}${nationalDigits}`
  };
}

/**
 * Backwards compatible validatePhone wrapper
 */
export function validatePhone(phone, options = {}) {
  return validateE164Phone(phone, options);
}

/**
 * Sanitizes phone input in real-time as the user types
 */
export function sanitizePhoneInput(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trimStart();
  const hasLeadingPlus = trimmed.startsWith('+');
  const withoutPlus = hasLeadingPlus ? trimmed.slice(1) : trimmed;
  let cleaned = '';
  let digitCount = 0;

  for (const char of withoutPlus) {
    if (/[0-9]/.test(char)) {
      if (digitCount < 15) {
        cleaned += char;
        digitCount++;
      }
    } else if (/[\s-]/.test(char)) {
      if (cleaned.length > 0 && !/[\s-]/.test(cleaned[cleaned.length - 1])) {
        cleaned += char;
      }
    }
  }

  return (hasLeadingPlus ? '+' : '') + cleaned;
}

/**
 * Extracts only numeric digits from a phone string
 */
export function getPhoneDigits(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Validates email address with RFC-compliant regex
 */
export function validateEmail(email, { required = true } = {}) {
  const clean = email ? String(email).trim() : '';

  if (!clean) {
    return {
      isValid: !required,
      error: required ? 'Email address is compulsory for follow-ups.' : ''
    };
  }

  if (clean.length > 100) {
    return {
      isValid: false,
      error: 'Email address cannot exceed 100 characters.'
    };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g. name@company.com).'
    };
  }

  return {
    isValid: true,
    error: ''
  };
}

/**
 * Validates Client Name
 */
export function validateClientName(name) {
  const clean = name ? String(name).trim() : '';

  if (!clean) {
    return {
      isValid: false,
      error: 'Client name is required.'
    };
  }

  if (clean.length < 2) {
    return {
      isValid: false,
      error: 'Client name must be at least 2 characters.'
    };
  }

  if (clean.length > 80) {
    return {
      isValid: false,
      error: 'Client name cannot exceed 80 characters.'
    };
  }

  // Check that it's not purely numbers or punctuation
  if (/^[^\p{L}]+$/u.test(clean)) {
    return {
      isValid: false,
      error: 'Client name must include letters.'
    };
  }

  return {
    isValid: true,
    error: ''
  };
}

/**
 * Validates Deal Value (INR)
 */
export function validateDealValue(value) {
  if (value === '' || value === null || value === undefined) {
    return {
      isValid: true,
      error: '',
      value: 0
    };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Deal value must be a valid number.',
      value: 0
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: 'Deal value cannot be negative.',
      value: num
    };
  }

  if (num > 1000000000) {
    return {
      isValid: false,
      error: 'Deal value exceeds maximum limit (₹100 Crore).',
      value: num
    };
  }

  return {
    isValid: true,
    error: '',
    value: num
  };
}

/**
 * Formats a live preview of deal value for sales users (e.g., "₹ 1,50,000 (1.5 Lakhs)")
 */
export function previewINR(amount) {
  const num = Number(amount);
  if (!num || isNaN(num) || num <= 0) return '₹0';

  const inrFormatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(num);

  if (num >= 10000000) {
    return `₹${inrFormatted} (${(num / 10000000).toFixed(2)} Cr)`;
  }
  if (num >= 100000) {
    return `₹${inrFormatted} (${(num / 100000).toFixed(2)} Lakhs)`;
  }
  if (num >= 1000) {
    return `₹${inrFormatted} (${(num / 1000).toFixed(1)}k)`;
  }
  return `₹${inrFormatted}`;
}

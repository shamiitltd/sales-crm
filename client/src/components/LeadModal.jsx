import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Save,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';
import PhoneInput from './ui/PhoneInput';
import { useAuth } from '../context/AuthContext';
import {
  validateE164Phone,
  validateEmail,
  validateClientName,
  validateDealValue,
  previewINR
} from '../utils/validators';

const STAGE_OPTIONS = [
  {
    value: 'New',
    label: 'New',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
  },
  {
    value: 'Contacted',
    label: 'Contacted',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
  },
  {
    value: 'Proposal Sent',
    label: 'Proposal Sent',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
  },
  {
    value: 'Negotiation',
    label: 'Negotiation',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
  },
  {
    value: 'Closed Won',
    label: 'Closed Won',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
  },
  {
    value: 'Closed Lost',
    label: 'Closed Lost',
    badgeClass: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
  }
];

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High', dotColor: 'bg-red-500' },
  { value: 'Medium', label: 'Medium', dotColor: 'bg-amber-500' },
  { value: 'Low', label: 'Low', dotColor: 'bg-slate-400' }
];

const SOURCE_OPTIONS = [
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Campaign', label: 'Campaign' },
  { value: 'Direct Outreach', label: 'Direct' },
  { value: 'Other', label: 'Other' }
];

function getDefaultState(lead, initialStage) {
  const today = new Date().toISOString().split('T')[0];
  if (lead) {
    return {
      client_name: lead.client_name || '',
      company: lead.company || '',
      contact_number: lead.contact_number || '',
      email: lead.email || '',
      source: lead.source || 'Website',
      stage: lead.stage || initialStage || 'New',
      deal_value: lead.deal_value !== undefined ? String(lead.deal_value) : '0',
      priority: lead.priority || 'Medium',
      next_followup_date: lead.next_followup_date
        ? lead.next_followup_date.split(' ')[0]
        : today,
      notes: lead.notes || ''
    };
  }
  return {
    client_name: '',
    company: '',
    contact_number: '',
    email: '',
    source: 'Website',
    stage: initialStage || 'New',
    deal_value: '0',
    priority: 'Medium',
    next_followup_date: today,
    notes: ''
  };
}

export default function LeadModal({
  isOpen,
  onClose,
  onSubmit,
  initialStage = 'New',
  lead = null,
  isSubmitting: externalSubmitting = false
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(() => getDefaultState(lead, initialStage));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  // Sync state whenever modal opens or initial parameters change
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultState(lead, initialStage));
      setErrors({});
      setTouched({});
      setApiError('');
    }
  }, [isOpen, lead, initialStage]);

  if (!isOpen) return null;

  const isEditMode = Boolean(lead && lead.id);
  const isSubmitting = externalSubmitting || localSubmitting;

  /**
   * Field Validation
   * Validates Client Name, Contact Phone (E.164), Email, Stage, Deal Value, and Follow-up Date.
   */
  const validate = (dataToValidate = formData) => {
    const errs = {};

    // 1. Client Name: Required (2-80 characters)
    const nameRes = validateClientName(dataToValidate.client_name);
    if (!nameRes.isValid) {
      errs.client_name = nameRes.error;
    }

    // 2. Contact Phone: Required. Validate E.164 international format and country length/prefix
    const phoneRes = validateE164Phone(dataToValidate.contact_number, { required: true });
    if (!phoneRes.isValid) {
      errs.contact_number = phoneRes.error;
    }

    // 3. Email Address: Required. Strict RFC email regex pattern
    const emailRes = validateEmail(dataToValidate.email, { required: true });
    if (!emailRes.isValid) {
      errs.email = emailRes.error;
    }

    // 4. Stage: Required (defaults to 'New')
    if (!dataToValidate.stage || !dataToValidate.stage.trim()) {
      errs.stage = 'Pipeline stage is required.';
    }

    // 5. Deal Value: Required non-negative number
    const dealRes = validateDealValue(dataToValidate.deal_value);
    if (!dealRes.isValid) {
      errs.deal_value = dealRes.error;
    }

    // 6. Next Follow-up Date: Required. Must not allow past dates (minimum date: today)
    if (!dataToValidate.next_followup_date || !dataToValidate.next_followup_date.trim()) {
      errs.next_followup_date = 'Follow-up date is required.';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (dataToValidate.next_followup_date < today) {
        errs.next_followup_date = 'Follow-up date cannot be in the past.';
      }
    }

    return errs;
  };

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
    if (apiError) setApiError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'deal_value') {
      // Strip negative signs and non-numeric characters, enforce non-negative
      const cleaned = value.replace(/[^0-9]/g, '');
      const numVal = cleaned === '' ? '' : String(Math.min(1000000000, Number(cleaned)));
      handleFieldChange(name, numVal);

      if (touched.deal_value) {
        const res = validateDealValue(numVal);
        if (!res.isValid) {
          setErrors((prev) => ({ ...prev, deal_value: res.error }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.deal_value;
            return next;
          });
        }
      }
      return;
    }

    if (name === 'client_name') {
      if (value.length <= 80) {
        handleFieldChange(name, value);
        if (touched.client_name) {
          const res = validateClientName(value);
          if (!res.isValid) {
            setErrors((prev) => ({ ...prev, client_name: res.error }));
          } else {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.client_name;
              return next;
            });
          }
        }
      }
      return;
    }

    if (name === 'email') {
      if (value.length <= 100) {
        handleFieldChange(name, value);
        if (touched.email) {
          const res = validateEmail(value, { required: true });
          if (!res.isValid) {
            setErrors((prev) => ({ ...prev, email: res.error }));
          } else {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.email;
              return next;
            });
          }
        }
      }
      return;
    }

    if (name === 'company') {
      if (value.length <= 100) {
        handleFieldChange(name, value);
      }
      return;
    }

    if (name === 'notes') {
      if (value.length <= 500) {
        handleFieldChange(name, value);
      }
      return;
    }

    handleFieldChange(name, value);
  };

  /**
   * Quick Deal Value modifier helper:
   * Adds values mathematically as numbers without converting to strings
   */
  const handleAddDealValue = (amountToAdd) => {
    const currentVal = Number(formData.deal_value) || 0;
    const newVal = Math.min(1000000000, currentVal + Number(amountToAdd));
    handleFieldChange('deal_value', String(newVal));
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));

    if (fieldName === 'contact_number') {
      const res = validateE164Phone(formData.contact_number, { required: true });
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, contact_number: res.error }));
      }
    } else if (fieldName === 'email') {
      const res = validateEmail(formData.email, { required: true });
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, email: res.error }));
      }
    } else if (fieldName === 'client_name') {
      const res = validateClientName(formData.client_name);
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, client_name: res.error }));
      }
    } else if (fieldName === 'deal_value') {
      const res = validateDealValue(formData.deal_value);
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, deal_value: res.error }));
      }
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrors({});
    setTouched({});
    setApiError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Mark all compulsory fields as touched
    setTouched({
      client_name: true,
      contact_number: true,
      email: true,
      stage: true,
      deal_value: true,
      next_followup_date: true
    });

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setApiError('');
    setLocalSubmitting(true);

    try {
      // E.164 compliance: Strip whitespace, hyphens, and parentheses on submit
      const sanitizedPhone = (formData.contact_number || '').replace(/[\s\-\(\)]/g, '').trim();

      const payload = {
        ...formData,
        user_id: user?.id,
        client_name: formData.client_name.trim(),
        company: (formData.company || '').trim(),
        contact_number: sanitizedPhone,
        email: formData.email.trim(),
        deal_value: Number(formData.deal_value) || 0,
        notes: (formData.notes || '').trim()
      };

      await onSubmit(payload);

      // Reset form state completely to initial values immediately upon successful submission
      setFormData(getDefaultState(null, initialStage));
      setErrors({});
      setTouched({});
      setApiError('');
      onClose();
    } catch (err) {
      // Keep entered form inputs intact and display the backend error message in top alert banner
      console.error('Lead form submission failed:', err);
      setApiError(err.message || 'Failed to save lead. Please check the entered data.');
    } finally {
      setLocalSubmitting(false);
    }
  };

  // Reusable input styling token with standardized 48px height matching design requirements
  const baseInputStyle =
    'w-full h-[48px] px-3.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 outline-none shadow-xs ' +
    'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
    'dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/20';

  const getInputClass = (fieldName) => {
    if (errors[fieldName]) {
      return `${baseInputStyle} border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20`;
    }
    // Subtle emerald border highlight if field is touched and valid
    if (touched[fieldName]) {
      if (fieldName === 'email' && validateEmail(formData.email, { required: true }).isValid) {
        return `${baseInputStyle} border-emerald-500/70 dark:border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20`;
      }
      if (fieldName === 'client_name' && validateClientName(formData.client_name).isValid) {
        return `${baseInputStyle} border-emerald-500/70 dark:border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20`;
      }
      if (fieldName === 'deal_value' && validateDealValue(formData.deal_value).isValid) {
        return `${baseInputStyle} border-emerald-500/70 dark:border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20`;
      }
    }
    return baseInputStyle;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      {/* Responsive Modal Container: Max width ~760px, Max height calc(100dvh - 32px), independent scroll */}
      <div
        className="relative w-full max-w-[760px] max-h-[calc(100dvh-32px)] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
      >
        {/* Pinned Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xs shrink-0">
          <div>
            <h3
              id="lead-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] flex items-center gap-2"
            >
              {isEditMode ? 'Edit Sales Lead' : 'Add New Sales Lead'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditMode
                ? `Update details and progress for ${formData.client_name || 'lead'}`
                : 'Create a new prospect for SHAMIIT LLP sales pipeline'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body with Consistent Tailwind Spacing */}
        <form
          id="lead-modal-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Top-level API Error banner if submission fails */}
          {apiError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{apiError}</div>
            </div>
          )}

          {/* Row 1: Client Name and Company Name (Two Equal Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="client_name"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  Client Name <span className="text-red-500">*</span>
                  {touched.client_name && !errors.client_name && validateClientName(formData.client_name).isValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                  )}
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {(formData.client_name || '').length}/80
                </span>
              </div>
              <input
                type="text"
                id="client_name"
                name="client_name"
                maxLength={80}
                value={formData.client_name || ''}
                onChange={handleInputChange}
                onBlur={() => handleBlur('client_name')}
                placeholder="e.g. Acme Technologies"
                aria-invalid={Boolean(errors.client_name)}
                aria-describedby={errors.client_name ? 'client_name-error' : undefined}
                className={getInputClass('client_name')}
                autoFocus
              />
              {errors.client_name && (
                <p
                  id="client_name-error"
                  className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.client_name}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="company"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Company Name
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {(formData.company || '').length}/100
                </span>
              </div>
              <input
                type="text"
                id="company"
                name="company"
                maxLength={100}
                value={formData.company || ''}
                onChange={handleInputChange}
                placeholder="e.g. Acme Corp Pvt Ltd"
                className={getInputClass('company')}
              />
            </div>
          </div>

          {/* Row 2: Contact Phone and Email Address (Two Equal Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="contact_number"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  Contact Phone <span className="text-red-500">*</span>
                </label>
              </div>
              <PhoneInput
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={(e164Val, validation) => {
                  handleFieldChange('contact_number', e164Val);
                  if (touched.contact_number) {
                    if (!validation.isValid) {
                      setErrors((prev) => ({ ...prev, contact_number: validation.error }));
                    } else {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.contact_number;
                        return next;
                      });
                    }
                  }
                }}
                onBlur={() => handleBlur('contact_number')}
                error={errors.contact_number}
                touched={touched.contact_number}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  Email Address <span className="text-red-500">*</span>
                  {touched.email && !errors.email && validateEmail(formData.email, { required: true }).isValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                  )}
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {(formData.email || '').length}/100
                </span>
              </div>
              <input
                type="email"
                id="email"
                name="email"
                maxLength={100}
                value={formData.email || ''}
                onChange={handleInputChange}
                onBlur={() => handleBlur('email')}
                placeholder="contact@acme.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={getInputClass('email')}
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Pipeline Stage, Priority, and Source (Three Equal Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-5">
            <CustomSelect
              label="Pipeline Stage"
              required
              value={formData.stage}
              onChange={(val) => handleFieldChange('stage', val)}
              options={STAGE_OPTIONS}
              error={errors.stage}
            />

            <CustomSelect
              label="Priority"
              value={formData.priority}
              onChange={(val) => handleFieldChange('priority', val)}
              options={PRIORITY_OPTIONS}
            />

            <CustomSelect
              label="Source"
              value={formData.source}
              onChange={(val) => handleFieldChange('source', val)}
              options={SOURCE_OPTIONS}
            />
          </div>

          {/* Row 4: Deal Value and Next Follow-up Date (Two Equal Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="deal_value"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Deal Value (INR) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                  {previewINR(formData.deal_value)}
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-bold text-sm pointer-events-none select-none">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  id="deal_value"
                  name="deal_value"
                  value={formData.deal_value}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                  }}
                  onBlur={() => handleBlur('deal_value')}
                  placeholder="0"
                  aria-invalid={Boolean(errors.deal_value)}
                  aria-describedby={errors.deal_value ? 'deal_value-error' : undefined}
                  className={`${getInputClass('deal_value')} pl-8`}
                />
              </div>

              {/* Quick Value Increment Buttons: Compact Secondary Controls */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[
                  { label: '+10K', add: 10000 },
                  { label: '+50K', add: 50000 },
                  { label: '+1 Lakh', add: 100000 },
                  { label: '+5 Lakh', add: 500000 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleAddDealValue(preset.add)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
                {Number(formData.deal_value) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange('deal_value', '0')}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              {errors.deal_value && (
                <p
                  id="deal_value-error"
                  className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.deal_value}</span>
                </p>
              )}
            </div>

            <CustomDatePicker
              label="Next Follow-up Date"
              required
              minDate={new Date().toISOString().split('T')[0]}
              value={formData.next_followup_date}
              onChange={(val) => {
                handleFieldChange('next_followup_date', val);
                const today = new Date().toISOString().split('T')[0];
                if (val && val < today) {
                  setErrors((prev) => ({ ...prev, next_followup_date: 'Follow-up date cannot be in the past.' }));
                } else {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.next_followup_date;
                    return copy;
                  });
                }
              }}
              error={errors.next_followup_date}
            />
          </div>

          {/* Row 5: Initial Notes / Details (Full Width Field) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="notes"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Initial Notes / Details
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {(formData.notes || '').length}/500
              </span>
            </div>
            <textarea
              id="notes"
              name="notes"
              maxLength={500}
              value={formData.notes || ''}
              onChange={handleInputChange}
              placeholder="e.g. Inbound inquiry interested in 25 CRM user licenses and custom workflow sync..."
              className="w-full h-[96px] min-h-[96px] max-h-[160px] px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors duration-150 outline-none shadow-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-2 dark:focus:ring-blue-500/20 resize-none"
            />
          </div>
        </form>

        {/* Pinned Footer with Subdued Top Border & Consistent Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-[44px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors font-medium text-sm shadow-xs cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="lead-modal-form"
            disabled={isSubmitting}
            className="h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                {isEditMode ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{isEditMode ? 'Save Changes' : 'Create Lead'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

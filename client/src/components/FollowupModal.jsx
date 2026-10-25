import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Check
} from 'lucide-react';
import {
  sanitizePhoneInput,
  getPhoneDigits,
  validatePhone,
  validateEmail,
  validateClientName,
  validateDealValue,
  previewINR
} from '../utils/validators';

const STATUS_OPTIONS = [
  'New',
  'In Discussion',
  'Follow-up Scheduled',
  'Closed Won',
  'Closed Lost'
];

export default function FollowupModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    client_name: '',
    contact_number: '',
    email: '',
    lead_status: 'New',
    deal_value: 0,
    followup_date: '',
    notes: ''
  });

  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        client_name: initialData.client_name || '',
        contact_number: initialData.contact_number || '',
        email: initialData.email || '',
        lead_status: initialData.lead_status || 'New',
        deal_value: initialData.deal_value || 0,
        followup_date: initialData.followup_date || '',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        client_name: '',
        contact_number: '',
        email: '',
        lead_status: 'New',
        deal_value: 0,
        followup_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setValidationError('');
  }, [initialData, isOpen]);

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    const nameRes = validateClientName(formData.client_name);
    if (!nameRes.isValid) errs.client_name = nameRes.error;

    if (formData.contact_number && formData.contact_number.trim()) {
      const phoneRes = validatePhone(formData.contact_number, { required: false });
      if (!phoneRes.isValid) errs.contact_number = phoneRes.error;
    }

    if (formData.email && formData.email.trim()) {
      const emailRes = validateEmail(formData.email, { required: false });
      if (!emailRes.isValid) errs.email = emailRes.error;
    }

    const dealRes = validateDealValue(formData.deal_value);
    if (!dealRes.isValid) errs.deal_value = dealRes.error;

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'contact_number') {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, contact_number: sanitized }));
      if (errors.contact_number) {
        const res = validatePhone(sanitized, { required: false });
        if (res.isValid) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.contact_number;
            return next;
          });
        }
      }
      return;
    }

    if (name === 'deal_value') {
      const cleaned = value.replace(/[^0-9]/g, '');
      const numVal = cleaned === '' ? '' : Math.min(1000000000, Number(cleaned));
      setFormData((prev) => ({ ...prev, deal_value: numVal }));
      if (errors.deal_value) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.deal_value;
          return next;
        });
      }
      return;
    }

    if (name === 'client_name') {
      if (value.length <= 80) {
        setFormData((prev) => ({ ...prev, client_name: value }));
        if (errors.client_name) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.client_name;
            return next;
          });
        }
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setShortcutDate = (daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setFormData((prev) => ({
      ...prev,
      followup_date: d.toISOString().split('T')[0]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit({
      ...formData,
      client_name: (formData.client_name || '').trim(),
      contact_number: (formData.contact_number || '').trim(),
      email: (formData.email || '').trim(),
      deal_value: Number(formData.deal_value) || 0,
      notes: (formData.notes || '').trim()
    });
  };

  const isEdit = Boolean(initialData && initialData.id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              {isEdit ? 'Edit Follow-up Record' : 'Create New Follow-up'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Update lead progression and details' : 'Add new sales prospect to SHAMIIT CRM'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Client Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                Client / Company Name <span className="text-rose-400">*</span>
                {!errors.client_name && formData.client_name && validateClientName(formData.client_name).isValid && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                )}
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {(formData.client_name || '').length}/80
              </span>
            </div>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="client_name"
                maxLength={80}
                value={formData.client_name}
                onChange={handleChange}
                placeholder="e.g. Acme Global Solutions Pvt Ltd"
                required
                className={`w-full pl-9 pr-4 py-2 bg-slate-950 border rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition ${
                  errors.client_name
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            </div>
            {errors.client_name && (
              <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.client_name}
              </p>
            )}
          </div>

          {/* Contact Number & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Contact Number
                </label>
                <div>
                  {getPhoneDigits(formData.contact_number).length >= 10 && validatePhone(formData.contact_number, { required: false }).isValid ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Valid
                    </span>
                  ) : getPhoneDigits(formData.contact_number).length > 0 ? (
                    <span className="text-[10px] text-amber-400 font-medium">
                      {getPhoneDigits(formData.contact_number).length}/10 min
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">10–15 digits max</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  name="contact_number"
                  maxLength={18}
                  value={formData.contact_number}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-9 pr-4 py-2 bg-slate-950 border rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition ${
                    errors.contact_number
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700/80 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.contact_number && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.contact_number}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  Email Address
                  {!errors.email && formData.email && validateEmail(formData.email, { required: false }).isValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                  )}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {(formData.email || '').length}/100
                </span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  maxLength={100}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@company.com"
                  className={`w-full pl-9 pr-4 py-2 bg-slate-950 border rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition ${
                    errors.email
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700/80 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Status & Deal Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lead Status
              </label>
              <select
                name="lead_status"
                value={formData.lead_status}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Deal Value (INR ₹)
                </label>
                <span className="text-[10px] font-semibold text-indigo-400">
                  {previewINR(formData.deal_value)}
                </span>
              </div>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  name="deal_value"
                  value={formData.deal_value ?? ''}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                  }}
                  placeholder="150000"
                  className={`w-full pl-9 pr-4 py-2 bg-slate-950 border rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none transition ${
                    errors.deal_value
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-slate-700/80 focus:border-indigo-500'
                  }`}
                />
              </div>
              {errors.deal_value && (
                <p className="mt-1 text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.deal_value}
                </p>
              )}
            </div>
          </div>

          {/* Follow-up Date with Quick Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Scheduled Follow-up Date
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setShortcutDate(0)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutDate(1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutDate(3)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutDate(7)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  +1 Week
                </button>
              </div>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                name="followup_date"
                value={formData.followup_date}
                onChange={handleChange}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notes &amp; Discussion Highlights
            </label>
            <textarea
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Client requested quotation before EOD; discussed scope of cloud migration and support package..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEdit ? 'Save Changes' : 'Create Follow-up'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

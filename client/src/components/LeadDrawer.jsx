import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Save,
  Trash2,
  Clock,
  CheckCircle2,
  Plus,
  Send,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { STAGE_CONFIG, formatINR } from '../utils/formatters';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';
import PhoneInput from './ui/PhoneInput';
import {
  sanitizePhoneInput,
  getPhoneDigits,
  validatePhone,
  validateEmail,
  validateClientName,
  validateDealValue,
  previewINR
} from '../utils/validators';

const DRAWER_STAGE_OPTIONS = [
  { value: 'New', label: 'New', badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' },
  { value: 'Contacted', label: 'Contacted', badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' },
  { value: 'Proposal Sent', label: 'Proposal Sent', badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' },
  { value: 'Negotiation', label: 'Negotiation', badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' },
  { value: 'Closed Won', label: 'Closed Won', badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' },
  { value: 'Closed Lost', label: 'Closed Lost', badgeClass: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' }
];

const DRAWER_PRIORITY_OPTIONS = [
  { value: 'High', label: 'High Priority', dotColor: 'bg-red-500' },
  { value: 'Medium', label: 'Medium Priority', dotColor: 'bg-amber-500' },
  { value: 'Low', label: 'Low Priority', dotColor: 'bg-slate-400' }
];

export default function LeadDrawer({
  isOpen,
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  token
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'activities' | 'tasks'
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Activities state
  const [activities, setActivities] = useState([]);
  const [newActivityType, setNewActivityType] = useState('Call');
  const [newActivityText, setNewActivityText] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        client_name: lead.client_name || '',
        company: lead.company || '',
        contact_number: lead.contact_number || '',
        email: lead.email || '',
        source: lead.source || 'Website',
        stage: lead.stage || 'New',
        deal_value: lead.deal_value || 0,
        priority: lead.priority || 'Medium',
        next_followup_date: lead.next_followup_date || '',
        notes: lead.notes || ''
      });
      loadActivities(lead.id);
      loadTasks(lead.id);
    }
  }, [lead]);

  const loadActivities = async (leadId) => {
    try {
      const data = await api.getLeadActivities(leadId, token);
      setActivities(data || []);
    } catch (e) {
      console.error('Error loading activities:', e);
    }
  };

  const loadTasks = async (leadId) => {
    try {
      const data = await api.getTasks({ leadId }, token);
      setTasks(data || []);
    } catch (e) {
      console.error('Error loading tasks:', e);
    }
  };

  const [errors, setErrors] = useState({});

  if (!isOpen || !lead) return null;

  const validate = () => {
    const errs = {};
    const nameRes = validateClientName(formData.client_name);
    if (!nameRes.isValid) errs.client_name = nameRes.error;

    const phoneRes = validatePhone(formData.contact_number, { required: true });
    if (!phoneRes.isValid) errs.contact_number = phoneRes.error;

    const emailRes = validateEmail(formData.email, { required: true });
    if (!emailRes.isValid) errs.email = emailRes.error;

    const dealRes = validateDealValue(formData.deal_value);
    if (!dealRes.isValid) errs.deal_value = dealRes.error;

    return errs;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'contact_number') {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, contact_number: sanitized }));
      if (errors.contact_number) {
        const res = validatePhone(sanitized, { required: true });
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

    if (name === 'company') {
      if (value.length <= 100) {
        setFormData((prev) => ({ ...prev, company: value }));
      }
      return;
    }

    if (name === 'notes') {
      if (value.length <= 500) {
        setFormData((prev) => ({ ...prev, notes: value }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onUpdateLead(lead.id, {
        ...formData,
        client_name: (formData.client_name || '').trim(),
        company: (formData.company || '').trim(),
        contact_number: (formData.contact_number || '').replace(/[\s\-\(\)]/g, '').trim(),
        email: (formData.email || '').trim(),
        deal_value: Number(formData.deal_value) || 0,
        notes: (formData.notes || '').trim()
      });
      loadActivities(lead.id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivityText.trim()) return;

    setActivityLoading(true);
    try {
      await api.createActivity({
        lead_id: lead.id,
        type: newActivityType,
        description: newActivityText.trim()
      }, token);
      setNewActivityText('');
      await loadActivities(lead.id);
    } catch (err) {
      console.error('Error logging activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await api.toggleTask(taskId, token);
      await loadTasks(lead.id);
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await api.createTask({
        lead_id: lead.id,
        title: newTaskTitle.trim(),
        due_date: newTaskDueDate || lead.next_followup_date || ''
      }, token);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      await loadTasks(lead.id);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.deleteTask(taskId, token);
      await loadTasks(lead.id);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const stageMeta = STAGE_CONFIG[formData.stage] || STAGE_CONFIG['New'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer matching cheat sheet: w-[500px] */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[500px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
                {formData.client_name || lead.client_name}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageMeta.badge}`}>
                {formData.stage}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formData.company || 'Company not specified'} &bull; Deal: <strong className="text-slate-800 dark:text-slate-200">{formatINR(formData.deal_value)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profile &amp; Details
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'activities'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Activity Timeline ({activities.length})
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Action Items ({tasks.length})
          </button>
        </div>

        {/* Tab 1: Profile & Details Form */}
        {activeTab === 'details' && (
          <form onSubmit={handleSaveDetails} className="flex-1 p-5 space-y-4 overflow-y-auto" noValidate>
            {Object.keys(errors).length > 0 && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Please fix the highlighted validation errors before saving.
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Client Name <span className="text-red-500">*</span>
                  {!errors.client_name && formData.client_name && validateClientName(formData.client_name).isValid && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                  )}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {(formData.client_name || '').length}/80
                </span>
              </div>
              <input
                type="text"
                name="client_name"
                maxLength={80}
                value={formData.client_name || ''}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition ${
                  errors.client_name
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                }`}
              />
              {errors.client_name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.client_name}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Company / Organization
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {(formData.company || '').length}/100
                </span>
              </div>
              <input
                type="text"
                name="company"
                maxLength={100}
                value={formData.company || ''}
                onChange={handleInputChange}
                placeholder="e.g. Acme Corp Pvt Ltd"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                </div>
                <PhoneInput
                  value={formData.contact_number}
                  onChange={(e164Val, validation) => {
                    setFormData((prev) => ({ ...prev, contact_number: e164Val }));
                    if (errors.contact_number) {
                      if (validation.isValid) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.contact_number;
                          return next;
                        });
                      } else {
                        setErrors((prev) => ({ ...prev, contact_number: validation.error }));
                      }
                    }
                  }}
                  onBlur={() => {
                    const res = validatePhone(formData.contact_number, { required: true });
                    if (!res.isValid) {
                      setErrors((prev) => ({ ...prev, contact_number: res.error }));
                    }
                  }}
                  error={errors.contact_number}
                  touched={true}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    Email Address <span className="text-red-500">*</span>
                    {!errors.email && formData.email && validateEmail(formData.email, { required: true }).isValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
                    )}
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {(formData.email || '').length}/100
                  </span>
                </div>
                <input
                  type="email"
                  name="email"
                  maxLength={100}
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  placeholder="contact@company.com"
                  required
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition ${
                    errors.email
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Pipeline Stage"
                required
                value={formData.stage}
                onChange={(val) => setFormData((prev) => ({ ...prev, stage: val }))}
                options={DRAWER_STAGE_OPTIONS}
              />

              <CustomSelect
                label="Priority"
                value={formData.priority}
                onChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                options={DRAWER_PRIORITY_OPTIONS}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Deal Value (INR ₹) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {previewINR(formData.deal_value)}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  name="deal_value"
                  value={formData.deal_value ?? ''}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none transition ${
                    errors.deal_value
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                  }`}
                />
                {errors.deal_value && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.deal_value}
                  </p>
                )}
              </div>

              <CustomDatePicker
                label="Next Follow-up"
                required
                value={formData.next_followup_date ? formData.next_followup_date.split(' ')[0] : ''}
                onChange={(val) => setFormData((prev) => ({ ...prev, next_followup_date: val }))}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Internal Sales Notes
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {(formData.notes || '').length}/500
                </span>
              </div>
              <textarea
                name="notes"
                rows="4"
                maxLength={500}
                value={formData.notes || ''}
                onChange={handleInputChange}
                placeholder="Log discussion takeaways, executive requests, or next milestones..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Save & Delete Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDeleteLead(lead)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Activity Timeline */}
        {activeTab === 'activities' && (
          <div className="flex-1 p-5 flex flex-col overflow-hidden">
            {/* Log New Activity Box */}
            <form onSubmit={handleAddActivity} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Log Interaction:</span>
                <select
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="Call">📞 Call</option>
                  <option value="Meeting">👥 Meeting</option>
                  <option value="Email">✉️ Email</option>
                  <option value="Note">📝 Note</option>
                </select>
              </div>

              <textarea
                value={newActivityText}
                onChange={(e) => setNewActivityText(e.target.value)}
                placeholder="Log call outcome or meeting summary..."
                rows="2"
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
              />

              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={activityLoading || !newActivityText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Log Activity</span>
                </button>
              </div>
            </form>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No interactions recorded yet.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      {act.type === 'Call' && <PhoneCall className="w-3.5 h-3.5 text-blue-500" />}
                      {act.type === 'Meeting' && <Video className="w-3.5 h-3.5 text-purple-500" />}
                      {act.type === 'Email' && <Mail className="w-3.5 h-3.5 text-emerald-500" />}
                      {act.type === 'Stage Change' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                      {act.type === 'Note' && <FileText className="w-3.5 h-3.5 text-slate-400" />}
                    </div>

                    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{act.type}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Action Items Checklist */}
        {activeTab === 'tasks' && (
          <div className="flex-1 p-5 flex flex-col overflow-hidden">
            {/* Add Task Box */}
            <form onSubmit={handleAddTask} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 shrink-0">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add new action item / task..."
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-2"
              />
              <div className="flex items-center justify-between">
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="text-xs bg-transparent text-slate-600 dark:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition"
                >
                  Add Task
                </button>
              </div>
            </form>

            {/* Checklist */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No action items created yet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 mr-2">
                      <input
                        type="checkbox"
                        checked={Boolean(task.is_completed)}
                        onChange={() => handleToggleTask(task.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={task.is_completed ? 'line-through text-slate-400 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.due_date && (
                        <span className="text-[10px] text-slate-400">
                          {task.due_date}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-red-500 transition p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

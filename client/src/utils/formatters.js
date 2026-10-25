/**
 * Format Indian Rupee currency representation
 */
export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatCompactINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const num = Number(amount);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(1)} K`;
  }
  return `₹${num}`;
}

/**
 * Stage configuration matching design reference
 */
export const STAGE_CONFIG = {
  'New': {
    label: 'New',
    hex: '#3B82F6',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50',
    headerAccent: 'border-t-4 border-t-blue-500'
  },
  'Contacted': {
    label: 'Contacted',
    hex: '#8B5CF6',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50',
    headerAccent: 'border-t-4 border-t-purple-500'
  },
  'Proposal Sent': {
    label: 'Proposal Sent',
    hex: '#F59E0B',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50',
    headerAccent: 'border-t-4 border-t-amber-500'
  },
  'Negotiation': {
    label: 'Negotiation',
    hex: '#F97316',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50',
    headerAccent: 'border-t-4 border-t-orange-500'
  },
  'Closed Won': {
    label: 'Closed Won',
    hex: '#10B981',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50',
    headerAccent: 'border-t-4 border-t-green-500'
  },
  'Closed Lost': {
    label: 'Closed Lost',
    hex: '#EF4444',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50',
    headerAccent: 'border-t-4 border-t-rose-500'
  }
};

/**
 * Priority badges
 */
export const PRIORITY_CONFIG = {
  'High': {
    badge: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/60'
  },
  'Medium': {
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
  },
  'Low': {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
  }
};

/**
 * Calculate follow-up date relative urgency badge (Overdue, Today, Won, Date)
 */
export function getFollowupUrgency(dateStr, stage) {
  if (stage === 'Closed Won') {
    return { label: 'Won', type: 'won', style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/60' };
  }
  if (!dateStr) return { label: 'No Date', type: 'none', style: 'text-slate-400' };

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = new Date(dateStr.split(' ')[0]);
  const today = new Date(todayStr);

  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', type: 'overdue', style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/60' };
  } else if (diffDays === 0) {
    return { label: 'Today', type: 'today', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60' };
  } else {
    // Format e.g. Oct 25, 2025
    try {
      const formatted = new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return { label: formatted, type: 'upcoming', style: 'text-slate-500 dark:text-slate-400' };
    } catch {
      return { label: dateStr, type: 'upcoming', style: 'text-slate-500 dark:text-slate-400' };
    }
  }
}

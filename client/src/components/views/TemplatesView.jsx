import React, { useState } from 'react';
import { Copy, Check, FileText, Send, Sparkles } from 'lucide-react';

const TEMPLATES = [
  {
    id: 1,
    title: 'Initial Discovery & Product Demo Invitation',
    category: 'New Lead Outreach',
    subject: 'Streamlining your sales operations — SHAMIIT LLP',
    body: `Hi {{ClientName}},

Thank you for your interest in our Enterprise Sales CRM solutions. 

We help growing organizations automate pipeline tracking, eliminate manual spreadsheet errors, and seamlessly synchronize customer follow-ups with automated Google Drive backups.

Would you be open to a brief 15-minute discovery call this week to see a quick live walkthrough tailored to {{Company}}?

Best regards,
{{RepName}}
SHAMIIT LLP | Sales Division`
  },
  {
    id: 2,
    title: 'Post-Demo Proposal & Next Steps Follow-up',
    category: 'Proposal Sent',
    subject: 'Proposal & Commercial Scope for {{Company}} — SHAMIIT LLP',
    body: `Hi {{ClientName}},

It was a pleasure speaking with you and discussing {{Company}}'s workflow requirements.

As discussed, I have attached our detailed commercial proposal and technical scope. Here is a summary of what's included:
- Dedicated CRM database deployment
- Real-time pipeline Kanban & activity audit timeline
- Automated Google Drive multi-sheet Excel synchronization

Please let me know if you have any questions regarding the SLA or milestone delivery schedules.

Looking forward to your thoughts,
{{RepName}}
SHAMIIT LLP`
  },
  {
    id: 3,
    title: 'Commercial Negotiation & Discount Offer',
    category: 'Negotiation',
    subject: 'Special terms for {{Company}} Q4 onboarding',
    body: `Hi {{ClientName}},

Following our conversation regarding the terms for {{Company}}, I reviewed the commercial structure with our leadership team.

We are pleased to offer a 10% prepayment benefit for an annual agreement if confirmed before EOD this Friday. This will lock in your priority implementation slot and dedicated account manager.

Shall I issue the updated agreement for signature?

Warm regards,
{{RepName}}
SHAMIIT LLP`
  },
  {
    id: 4,
    title: 'Re-engagement for Inactive / Pending Leads',
    category: 'Follow-up Cadence',
    subject: 'Checking in on {{Company}} CRM roadmap',
    body: `Hi {{ClientName}},

I wanted to quickly check back in with you regarding {{Company}}'s sales pipeline tracking initiatives.

Are you still exploring solutions to streamline your sales operations, or has this priority shifted to next quarter?

Either way, please let me know so I can align our calendar accordingly.

Best,
{{RepName}}
SHAMIIT LLP`
  }
];

export default function TemplatesView({ onCopyNotify }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (template) => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body}`);
    setCopiedId(template.id);
    if (onCopyNotify) onCopyNotify('Copied to clipboard', `Template "${template.title}" copied!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Sales Outreach &amp; Follow-up Templates
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standardized sales email and messaging scripts with 1-click clipboard copy
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {tmpl.category}
                </span>
                <button
                  onClick={() => handleCopy(tmpl)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                >
                  {copiedId === tmpl.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-['Outfit'] mb-1">
                {tmpl.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">
                Subject: <span className="font-normal text-slate-700 dark:text-slate-300">{tmpl.subject}</span>
              </p>

              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {tmpl.body}
              </pre>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

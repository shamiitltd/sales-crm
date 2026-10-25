import React, { useState, useMemo } from 'react';
import { Contact, Search, Phone, Mail, Building, Plus, ExternalLink } from 'lucide-react';
import { STAGE_CONFIG } from '../../utils/formatters';

export default function ContactsView({ leads = [], onSelectLead, onOpenAddModal }) {
  const [searchTerm, setSearchTerm] = useState('');

  const contacts = useMemo(() => {
    return leads.map((l) => ({
      id: l.id,
      name: l.client_name,
      company: l.company || 'Direct Client',
      phone: l.contact_number,
      email: l.email,
      stage: l.stage,
      lead: l
    }));
  }, [leads]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.company.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [contacts, searchTerm]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Customer Contacts Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {contacts.length} registered business contact{contacts.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => onOpenAddModal && onOpenAddModal('New')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts List / Table */}
      {filteredContacts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <Contact className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No contacts found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Contacts are automatically populated when you create sales leads.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Contact Name</th>
                <th className="px-4 py-3.5">Company</th>
                <th className="px-4 py-3.5">Phone Number</th>
                <th className="px-4 py-3.5">Email Address</th>
                <th className="px-4 py-3.5">Lead Stage</th>
                <th className="px-4 py-3.5 text-right">Quick Communication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredContacts.map((contact) => {
                const stageMeta = STAGE_CONFIG[contact.stage] || STAGE_CONFIG['New'];

                return (
                  <tr
                    key={contact.id}
                    onClick={() => onSelectLead(contact.lead)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition">
                      {contact.name}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{contact.company}</span>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {contact.phone || '—'}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                      {contact.email || '—'}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageMeta.badge}`}>
                        {contact.stage}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            title="Call contact"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            title="Email contact"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => onSelectLead(contact.lead)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title="Open lead details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

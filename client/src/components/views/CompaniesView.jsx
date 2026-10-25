import React, { useState, useMemo } from 'react';
import { Building, Search, Phone, Mail, ArrowUpRight, Plus, FolderKanban } from 'lucide-react';
import { formatINR, STAGE_CONFIG } from '../../utils/formatters';

export default function CompaniesView({ leads = [], onSelectLead, onOpenAddModal }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Group leads by company
  const companies = useMemo(() => {
    const map = {};
    for (const lead of leads) {
      const companyKey = (lead.company && lead.company.trim()) || lead.client_name;
      if (!map[companyKey]) {
        map[companyKey] = {
          name: companyKey,
          client: lead.client_name,
          phone: lead.contact_number,
          email: lead.email,
          totalValue: 0,
          leadCount: 0,
          latestStage: lead.stage,
          leads: []
        };
      }
      map[companyKey].totalValue += Number(lead.deal_value || 0);
      map[companyKey].leadCount += 1;
      map[companyKey].leads.push(lead);
    }
    return Object.values(map);
  }, [leads]);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies;
    const term = searchTerm.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      (c.client && c.client.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [companies, searchTerm]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit']">
            Client Companies Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {companies.length} account{companies.length === 1 ? '' : 's'} managed across active sales pipelines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies..."
              className="pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => onOpenAddModal && onOpenAddModal('New')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <Building className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No companies found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Companies are automatically aggregated when you add leads with company details.
          </p>
          <button
            onClick={() => onOpenAddModal && onOpenAddModal('New')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Lead</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company, index) => {
            const stageConfig = STAGE_CONFIG[company.latestStage] || STAGE_CONFIG['New'];

            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-blue-300 dark:hover:border-blue-800/80 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 font-['Outfit']">
                        {company.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Contact: {company.client}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageConfig.badge}`}>
                    {company.latestStage}
                  </span>
                </div>

                <div className="my-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Deal Value</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 font-['Outfit']">
                      {formatINR(company.totalValue)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Pipeline Leads</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {company.leadCount} opportunity
                    </span>
                  </div>
                </div>

                {/* Leads associated list */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {company.leads.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => onSelectLead(l)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                        {l.client_name}
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                        {formatINR(l.deal_value)} &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

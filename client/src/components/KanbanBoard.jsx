import React, { useState, useRef } from 'react';
import {
  Calendar,
  Phone,
  Mail,
  FileText,
  Plus,
  GripVertical
} from 'lucide-react';
import {
  formatINR,
  STAGE_CONFIG,
  getFollowupUrgency
} from '../utils/formatters';

const KANBAN_STAGES = [
  'New',
  'Contacted',
  'Proposal Sent',
  'Negotiation',
  'Closed Won'
];

export default function KanbanBoard({
  leads = [],
  onSelectLead,
  onQuickStageChange,
  onOpenAddModal
}) {
  const [draggingLeadId, setDraggingLeadId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const isDraggingRef = useRef(false);

  // Group leads by stage
  const groupedLeads = KANBAN_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {});

  // Drag and Drop Handlers
  const handleDragStart = (e, lead) => {
    isDraggingRef.current = true;
    setDraggingLeadId(lead.id);

    // Provide both plain text ID and JSON metadata for maximum cross-browser reliability
    e.dataTransfer.setData('text/plain', String(lead.id));
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ id: lead.id, stage: lead.stage, client_name: lead.client_name })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingLeadId(null);
    setDragOverStage(null);

    // Slight delay prevents click handler from firing when releasing drag
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e, stage) => {
    // Only clear if dragging completely out of this column
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStage((current) => (current === stage ? null : current));
    }
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);

    let targetLeadId = draggingLeadId;
    let sourceStage = null;

    try {
      const jsonStr = e.dataTransfer.getData('application/json');
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        targetLeadId = data.id || targetLeadId;
        sourceStage = data.stage;
      }
    } catch {
      // Fallback to text/plain below
    }

    if (!targetLeadId) {
      targetLeadId = e.dataTransfer.getData('text/plain');
    }

    const draggedLead = leads.find((l) => String(l.id) === String(targetLeadId));
    const currentStage = sourceStage || draggedLead?.stage;

    // Trigger stage transition if moving to a different stage
    if (draggedLead && currentStage !== targetStage) {
      onQuickStageChange(draggedLead.id, targetStage);
    }
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-6 no-scrollbar [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {KANBAN_STAGES.map((stage) => {
        const stageLeads = groupedLeads[stage] || [];
        const config = STAGE_CONFIG[stage] || {
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          hex: '#64748B'
        };
        const isColumnOver = dragOverStage === stage;
        const isSourceOfDrag = stageLeads.some((l) => l.id === draggingLeadId);

        return (
          <div
            key={stage}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={(e) => handleDragLeave(e, stage)}
            onDrop={(e) => handleDrop(e, stage)}
            className={`w-72 shrink-0 rounded-xl border flex flex-col max-h-[calc(100vh-280px)] transition-all duration-150 ${
              isColumnOver && !isSourceOfDrag
                ? 'ring-2 ring-blue-500/60 bg-blue-50/50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-500 shadow-md'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-['Outfit']">
                  {stage}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${config.badge}`}>
                  {stageLeads.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenAddModal && onOpenAddModal(stage)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                title={`Add lead in ${stage}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards List Drop Zone */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {stageLeads.length === 0 ? (
                isColumnOver ? (
                  <div className="py-8 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 animate-in fade-in duration-150">
                    Drop lead to move to {stage}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No leads in {stage}
                  </div>
                )
              ) : (
                stageLeads.map((lead) => {
                  const urgency = getFollowupUrgency(lead.next_followup_date, lead.stage);
                  const isThisBeingDragged = draggingLeadId === lead.id;

                  return (
                    <div
                      key={lead.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isDraggingRef.current) return;
                        onSelectLead(lead);
                      }}
                      className={`bg-white dark:bg-slate-800 rounded-lg border p-3.5 transition duration-150 group select-none ${
                        isThisBeingDragged
                          ? 'opacity-35 scale-[0.98] border-dashed border-blue-500 shadow-none ring-2 ring-blue-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-grab active:cursor-grabbing'
                      }`}
                    >
                      {/* Top Row: Client Name, Grip Handle & Urgency Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 shrink-0 mt-0.5 cursor-grab" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug truncate">
                              {lead.client_name}
                            </h4>
                            {lead.company && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                {lead.company}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status/Urgency pill */}
                        {urgency.type === 'overdue' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 shrink-0">
                            Overdue
                          </span>
                        )}
                        {urgency.type === 'today' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                            Today
                          </span>
                        )}
                        {urgency.type === 'won' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800 shrink-0">
                            Won
                          </span>
                        )}
                      </div>

                      {/* Deal Value */}
                      <div className="my-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-['Outfit']">
                          {formatINR(lead.deal_value)}
                        </span>
                      </div>

                      {/* Follow-up Date */}
                      {lead.next_followup_date && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(lead.next_followup_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}

                      {/* Last Note / Activity Snippet */}
                      {lead.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-3 italic">
                          {lead.notes}
                        </p>
                      )}

                      {/* Bottom Row: Quick Stage Move & Quick Action Icons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        {/* Quick Stage Move Dropdown (Preserved for accessibility & quick clicking) */}
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.stage}
                            onChange={(e) => onQuickStageChange(lead.id, e.target.value)}
                            className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                          >
                            <option value="New">Move: New</option>
                            <option value="Contacted">Move: Contacted</option>
                            <option value="Proposal Sent">Move: Proposal</option>
                            <option value="Negotiation">Move: Negotiation</option>
                            <option value="Closed Won">Move: Won</option>
                            <option value="Closed Lost">Move: Lost</option>
                          </select>
                        </div>

                        {/* Quick Contact & Log Note Icons */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {lead.contact_number && (
                            <a
                              href={`tel:${lead.contact_number}`}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title={`Call ${lead.contact_number}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title={`Email ${lead.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectLead(lead)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="View details & activity timeline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Dynamic Drop Placeholder at the bottom of the list when dragging over a populated column */}
              {isColumnOver && draggingLeadId && !isSourceOfDrag && (
                <div className="h-16 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg bg-blue-50/40 dark:bg-blue-950/30 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 animate-in fade-in duration-150">
                  <span>Move to {stage}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

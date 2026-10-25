import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICards from './components/KPICards';
import ChartsSection from './components/ChartsSection';
import FilterBar from './components/FilterBar';
import KanbanBoard from './components/KanbanBoard';
import TableView from './components/TableView';
import LeadDrawer from './components/LeadDrawer';
import LeadModal from './components/LeadModal';
import GoogleDriveModal from './components/GoogleDriveModal';
import AuthModal from './components/AuthModal';
import DeleteModal from './components/DeleteModal';
import Toast from './components/Toast';
import { api } from './services/api';

import CompaniesView from './components/views/CompaniesView';
import ContactsView from './components/views/ContactsView';
import FollowupsView from './components/views/FollowupsView';
import CalendarView from './components/views/CalendarView';
import TemplatesView from './components/views/TemplatesView';
import ReportsView from './components/views/ReportsView';
import TrashView from './components/views/TrashView';
import SettingsView from './components/views/SettingsView';
import AuthScreen from './components/auth/AuthScreen';
import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { useSyncStatus } from './hooks/useSyncStatus';

function MainCRM() {
  const { token, user, refreshDriveStatus } = useAuth();

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((title, message = '', type = 'info') => {
    setToast({ title, message, type });
  }, []);

  // Real-time Sync Observability & Offline Resilience Hook
  const syncHook = useSyncStatus(token, showToast);

  // Navigation & View Mode
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Leads & Analytics State
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('All Stages');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Modals & Drawer State
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addInitialStage, setAddInitialStage] = useState('New');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handledRedirectRef = useRef(false);
  // Auto-detect ?drive_status=success on OAuth redirect, refresh status, and clean URL
  useEffect(() => {
    if (handledRedirectRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const driveStatus = params.get('drive_status');
    const googleSync = params.get('google_sync');

    if (driveStatus === 'success' || googleSync === 'connected') {
      handledRedirectRef.current = true;
      showToast('Google Drive Connected', 'Dedicated folder auto-provisioned. Auto-sync active!', 'success');
      if (typeof refreshDriveStatus === 'function') {
        refreshDriveStatus();
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (driveStatus === 'error' || googleSync === 'error') {
      handledRedirectRef.current = true;
      const errorMsg = params.get('message') || 'Could not complete Google OAuth connection.';
      showToast('Drive Connection Notice', errorMsg, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshDriveStatus, showToast]);

  /**
   * Load Dashboard Stats
   */
  const loadStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats(token);
      if (data) setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [token]);

  /**
   * Load Pipeline Leads
   */
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (selectedStage && selectedStage !== 'All Stages') params.stage = selectedStage;
      if (selectedPriority && selectedPriority !== 'All') params.priority = selectedPriority;

      const data = await api.getLeads(params, token);
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      showToast('Error', 'Failed to retrieve sales leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStage, selectedPriority, token]);

  // Initial and refresh trigger
  useEffect(() => {
    if (token) {
      loadStats();
      loadLeads();
    }
  }, [token, loadStats, loadLeads]);

  /**
   * Lead Creation (Atomically committed with initial activity)
   */
  const handleCreateLead = async (formData) => {
    setIsSubmitting(true);
    try {
      await api.createLead(formData, token);
      showToast('Lead Created', 'Lead created & queued for Drive sync', 'success');
      setAddModalOpen(false);
      await Promise.all([loadLeads(), loadStats()]);
      syncHook.triggerSync();
    } catch (err) {
      showToast('Creation Failed', err.message || 'Server rejected lead creation', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Lead Update with Snapshot Optimistic Rollback
   */
  const handleUpdateLead = async (id, updatedFields) => {
    const previousLeads = [...leads];
    const previousSelected = selectedLead ? { ...selectedLead } : null;

    // 1. Optimistic Update in State
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, ...updatedFields, updated_at: new Date().toISOString() } : lead));
    if (selectedLead && selectedLead.id === id) {
      setSelectedLead(prev => ({ ...prev, ...updatedFields }));
    }

    try {
      // 2. Transact with API
      const updated = await api.updateLead(id, updatedFields, token);
      showToast('Updated', `Saved changes for ${updated.client_name}`, 'success');
      setSelectedLead(updated);
      loadStats();
      syncHook.triggerSync();
    } catch (err) {
      // 3. Rollback immediately if rejected
      setLeads(previousLeads);
      if (previousSelected) setSelectedLead(previousSelected);
      showToast('Update Failed', err.message || 'Server error - rolled back changes', 'error');
      throw err;
    }
  };

  /**
   * Quick Stage Transition with Optimistic Kanban/Table Feedback
   */
  const handleQuickStageChange = async (id, newStage) => {
    const previousLeads = [...leads];

    // 1. Optimistically transition the stage locally
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, stage: newStage, updated_at: new Date().toISOString() } : lead));

    try {
      // 2. Persist to transactional backend
      await api.updateLead(id, { stage: newStage }, token);
      showToast('Stage Moved', `Lead transitioned to "${newStage}"`, 'success');
      loadStats();
      syncHook.triggerSync();
    } catch (err) {
      // 3. Revert to original state on failure
      setLeads(previousLeads);
      showToast('Move Failed', err.message || 'Failed to update stage - changes rolled back', 'error');
    }
  };

  /**
   * Soft Delete with Optimistic Pipeline Removal & Trash Recovery Guarantee
   */
  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    const previousLeads = [...leads];
    const targetLead = leadToDelete;

    // 1. Optimistically remove from active pipeline
    setLeads(prev => prev.filter(lead => lead.id !== targetLead.id));
    setDeleteModalOpen(false);
    setDrawerOpen(false);
    setLeadToDelete(null);

    setIsDeleting(true);
    try {
      // 2. Execute soft delete on backend
      await api.deleteLead(targetLead.id, token);
      showToast('Moved to Trash', `Archived ${targetLead.client_name}. Recover anytime from Archived Trash.`, 'info');
      loadStats();
      syncHook.triggerSync();
    } catch (err) {
      // 3. Revert if server fails
      setLeads(previousLeads);
      showToast('Delete Failed', err.message || 'Could not archive lead', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Direct Excel Download
   */
  const handleExportExcel = () => {
    const downloadUrl = api.getExcelDownloadUrl();
    window.open(downloadUrl, '_blank');
    showToast('Export Started', 'Downloading multi-sheet Excel master backup', 'info');
  };

  const handleFilterUrgent = () => {
    setSelectedStage('All Stages');
    setSelectedPriority('High');
    showToast('Filtered', "Showing urgent & high-priority follow-ups", 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Toast Feedback */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
        }}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        leadsCount={leads.length}
        urgentCount={stats?.metrics?.urgentFollowups || 0}
      />

      {/* Main Content Layout with Desktop Sidebar offset */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        
        {/* Real-time Network Connectivity Resilience Banner */}
        {!syncHook.isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>Offline Mode: Edits are saved locally to SQLite and will auto-sync to Google Drive once reconnected.</span>
          </div>
        )}

        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onOpenGoogleModal={() => setGoogleModalOpen(true)}
          onExportExcel={handleExportExcel}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          syncBadge={syncHook.badge}
        />

        {/* Dashboard Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <>
              {/* KPI Metrics Bar (4 Cards matching design mockup) */}
              <KPICards
                metrics={stats?.metrics}
                onFilterUrgent={handleFilterUrgent}
              />

              {/* Visual Analytics Charts Section (Horizontal Stage Bar + Monthly Dual Inflow Area) */}
              <ChartsSection
                stageDistribution={stats?.stageDistribution || []}
                monthlyTrend={stats?.monthlyTrend || []}
              />

              {/* Filter, Search & View Controls Bar */}
              <FilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                selectedPriority={selectedPriority}
                setSelectedPriority={setSelectedPriority}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpenAddModal={() => {
                  setAddInitialStage('New');
                  setAddModalOpen(true);
                }}
              />

              {/* Pipeline Display: Kanban Board OR Table View */}
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  leads={leads}
                  onSelectLead={(lead) => {
                    setSelectedLead(lead);
                    setDrawerOpen(true);
                  }}
                  onQuickStageChange={handleQuickStageChange}
                  onOpenAddModal={(stage) => {
                    setAddInitialStage(stage);
                    setAddModalOpen(true);
                  }}
                />
              ) : (
                <TableView
                  leads={leads}
                  loading={loading}
                  onSelectLead={(lead) => {
                    setSelectedLead(lead);
                    setDrawerOpen(true);
                  }}
                  onQuickStageChange={handleQuickStageChange}
                  onDeleteLead={(lead) => {
                    setLeadToDelete(lead);
                    setDeleteModalOpen(true);
                  }}
                />
              )}
            </>
          )}

          {currentTab === 'leads' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Filter, Search & View Controls Bar */}
              <FilterBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                selectedPriority={selectedPriority}
                setSelectedPriority={setSelectedPriority}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpenAddModal={() => {
                  setAddInitialStage('New');
                  setAddModalOpen(true);
                }}
              />

              {/* Pipeline Display: Kanban Board OR Table View */}
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  leads={leads}
                  onSelectLead={(lead) => {
                    setSelectedLead(lead);
                    setDrawerOpen(true);
                  }}
                  onQuickStageChange={handleQuickStageChange}
                  onOpenAddModal={(stage) => {
                    setAddInitialStage(stage);
                    setAddModalOpen(true);
                  }}
                />
              ) : (
                <TableView
                  leads={leads}
                  loading={loading}
                  onSelectLead={(lead) => {
                    setSelectedLead(lead);
                    setDrawerOpen(true);
                  }}
                  onQuickStageChange={handleQuickStageChange}
                  onDeleteLead={(lead) => {
                    setLeadToDelete(lead);
                    setDeleteModalOpen(true);
                  }}
                />
              )}
            </div>
          )}

          {currentTab === 'companies' && (
            <CompaniesView
              leads={leads}
              onSelectLead={(lead) => {
                setSelectedLead(lead);
                setDrawerOpen(true);
              }}
              onOpenAddModal={() => {
                setAddInitialStage('New');
                setAddModalOpen(true);
              }}
            />
          )}

          {currentTab === 'contacts' && (
            <ContactsView
              leads={leads}
              onSelectLead={(lead) => {
                setSelectedLead(lead);
                setDrawerOpen(true);
              }}
              onOpenAddModal={() => {
                setAddInitialStage('New');
                setAddModalOpen(true);
              }}
            />
          )}

          {currentTab === 'followups' && (
            <FollowupsView
              leads={leads}
              onSelectLead={(lead) => {
                setSelectedLead(lead);
                setDrawerOpen(true);
              }}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {currentTab === 'calendar' && (
            <CalendarView
              leads={leads}
              onSelectLead={(lead) => {
                setSelectedLead(lead);
                setDrawerOpen(true);
              }}
              onOpenAddModal={() => {
                setAddInitialStage('New');
                setAddModalOpen(true);
              }}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesView
              onCopyNotify={(title, msg, type) => showToast(title, msg, type)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              stats={stats}
              onExportExcel={handleExportExcel}
            />
          )}

          {currentTab === 'trash' && (
            <TrashView
              token={token}
              onRestoreSuccess={() => {
                loadLeads();
                loadStats();
                syncHook.triggerSync();
                showToast('Lead Restored', 'Lead recovered from trash to active pipeline', 'success');
              }}
              onPermanentDeleteSuccess={() => {
                loadStats();
                syncHook.triggerSync();
                showToast('Lead Purged', 'Lead permanently removed from database', 'info');
              }}
              onToast={showToast}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onOpenGoogleModal={() => setGoogleModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Slide-over Lead Profile, Timeline & Tasks Drawer */}
      <LeadDrawer
        isOpen={drawerOpen}
        lead={selectedLead}
        onClose={() => setDrawerOpen(false)}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={(lead) => {
          setLeadToDelete(lead);
          setDeleteModalOpen(true);
        }}
        token={token}
      />

      {/* Add New Lead Modal */}
      <LeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleCreateLead}
        initialStage={addInitialStage}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLeadToDelete(null);
        }}
        onConfirm={handleDeleteLead}
        clientName={leadToDelete?.client_name || ''}
        isDeleting={isDeleting}
      />

      {/* Google Drive OAuth2 Modal */}
      <GoogleDriveModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onExportExcel={handleExportExcel}
        token={token}
      />

      {/* Switch Account Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

    </div>
  );
}

function AppContent() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-xl shadow-blue-500/20 flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
          <span>Loading Sales CRM...</span>
        </div>
      </div>
    );
  }

  // Initial landing: if user is not signed in, render full-page Signup/Login page
  if (!token || !user) {
    return <AuthScreen />;
  }

  // Once registered or signed in, render the main dashboard workspace
  return <MainCRM />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

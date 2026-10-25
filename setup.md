# Sales CRM - Enterprise Edition Setup & Operation Manual
**A Product of SHAMIIT LLP**

A lightweight, high-performance Sales CRM built with **React (Vite) + Tailwind CSS**, **Node.js (Express)**, **SQLite (`better-sqlite3` & native `node:sqlite`)**, **JWT local authentication**, and **user-specific Google Drive OAuth2 integration** with automated folder provisioning and a 5-second debounced multi-sheet Excel master auto-sync.

---

## 🎨 UI/UX Design System & Color Tokens

The UI strictly adheres to the provided design reference in both **Light** and **Dark** modes:

| Element | Light Mode (`.light`) | Dark Mode (`.dark`) | Tailwind Classes |
|---|---|---|---|
| **Background** | `#F8FAFC` (`slate-50`) | `#020617` (`slate-950`) | `bg-slate-50 dark:bg-slate-950` |
| **Card / Surface** | `#FFFFFF` (`white`) | `#0F172A` (`slate-900`) | `bg-white dark:bg-slate-900` |
| **Border** | `#E2E8F0` (`slate-200`) | `#1E293B` (`slate-800`) | `border-slate-200 dark:border-slate-800` |
| **Text Primary** | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | `text-slate-900 dark:text-slate-100` |
| **Text Secondary**| `#64748B` (`slate-500`) | `#94A3B8` (`slate-400`) | `text-slate-500 dark:text-slate-400` |
| **Accent (Primary)**| `#2563EB` (`blue-600`) | `#3B82F6` (`blue-500`) | `bg-blue-600 dark:bg-blue-500` |
| **Success** | `#16A34A` (`green-600`) | `#22C55E` (`green-500`) | `text-emerald-600 dark:text-emerald-400` |
| **Warning** | `#F59E0B` (`amber-500`) | `#FBBF24` (`amber-400`) | `text-amber-600 dark:text-amber-400` |
| **Error** | `#EF4444` (`red-500`) | `#F87171` (`red-400`) | `text-red-500 dark:text-red-400` |

---

## 📁 Architecture & File Structure

```text
sales_crm/
├── client/                     # Frontend (React + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Left navigation matching mockup
│   │   │   ├── Header.jsx           # Breadcrumb, Drive badge, Theme toggle, User pill
│   │   │   ├── KPICards.jsx         # 4 KPI cards (Pipeline, Leads, Win Rate, Urgent)
│   │   │   ├── ChartsSection.jsx    # Horizontal Stage Funnel & Monthly Inflow Area Chart
│   │   │   ├── FilterBar.jsx        # Search, stage, priority pills, Kanban/Table switch
│   │   │   ├── KanbanBoard.jsx      # 5 Stage columns with rich lead cards
│   │   │   ├── TableView.jsx        # Tabular pipeline view with inline stage changer
│   │   │   ├── LeadDrawer.jsx       # 500px slide-over drawer (Profile, Timeline, Tasks)
│   │   │   ├── LeadModal.jsx        # "+ Add New Lead" modal
│   │   │   ├── GoogleDriveModal.jsx # User-specific OAuth2 status & sync controls
│   │   │   ├── AuthModal.jsx        # Sign In / Register / 1-Click Demo
│   │   │   └── Toast.jsx            # Floating feedback notifications
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx     # Dark/Light theme persistence & matchMedia fallback
│   │   │   └── AuthContext.jsx      # JWT state, user session & auto-login
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service with Bearer token
│   │   ├── utils/
│   │   │   └── formatters.js        # Indian Rupee (₹) formatters, Stage & Priority styles
│   │   ├── App.jsx                  # Master controller
│   │   └── index.css                # Dark variant configuration & typography
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend (Express + SQLite + Google APIs)
│   ├── db/
│   │   └── database.js              # SQLite engine, schema initialization & realistic seed
│   ├── services/
│   │   └── driveService.js          # Google OAuth2, folder provisioning, debounced sync
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT Bearer verification
│   ├── controllers/
│   │   ├── authController.js        # Login, Register, Profile
│   │   ├── leadsController.js       # CRUD, pipeline analytics & Excel buffer
│   │   ├── activitiesController.js  # Interaction timeline logging
│   │   ├── tasksController.js       # Action items checklist
│   │   └── googleController.js      # OAuth consent, callback, sync trigger
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── leadsRoutes.js
│   │   ├── activitiesRoutes.js
│   │   ├── tasksRoutes.js
│   │   └── googleRoutes.js
│   ├── server.js                    # Express application entrypoint
│   ├── index.js                     # Start alias
│   ├── .env                         # Server environment configuration
│   ├── .env.example
│   ├── crm.db                       # Local SQLite database
│   └── package.json
│
└── setup.md                         # This setup manual
```

---

## ⚡ Quick Start

### 1. Default Admin Credentials
The system comes pre-seeded with an administrator account:
- **Email**: `raghav@shamiit.com`
- **Password**: `admin123`
- *The frontend automatically authenticates into this account on first launch for instant evaluation.*

### 2. Running Both Servers

**Backend (Port 5000):**
```bash
cd server
npm start
```

**Frontend (Port 5173 / 5174):**
```bash
cd client
npm run dev
```

---

## ☁️ Google Drive OAuth2 Integration Setup

Each user can connect their personal or corporate Google Drive. When connected:
1. The system automatically creates a dedicated folder in their Drive: **`Sales CRM - SHAMIIT LLP`**.
2. Any lead creation, edit, deletion, or stage transition triggers a **5-second debounced auto-sync** that generates an updated multi-sheet `.xlsx` workbook (**`Sales_Pipeline_Master.xlsx`**) with:
   - **Sheet 1**: `Leads & Pipeline`
   - **Sheet 2**: `Activity History`
   - **Sheet 3**: `Executive Summary`
3. It updates/overwrites the file via `files.update` so a single, clean master file is maintained.

### Setting up OAuth2 Credentials in Google Cloud Console:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** in **APIs & Services > Library**.
3. In **OAuth consent screen**, select **External**, enter an App Name (e.g. `SHAMIIT Sales CRM`), and add the scope `https://www.googleapis.com/auth/drive.file`.
4. Go to **Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```text
     http://localhost:5000/api/google/callback
     ```
5. Copy the **Client ID** and **Client Secret** into [server/.env](file:///d:/Github/sales_crm/server/.env):
   ```env
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   JWT_SECRET=shamiit_crm_jwt_secret_2026
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
   ```
6. In the app header, click **"Connect Google Drive"** to authorize.

> **Offline Fallback**: Even without Google OAuth configured, users can click **"Download .xlsx"** in the header or drawer anytime to export the complete multi-sheet workbook directly to their browser!

---

## 🗄️ Database Schema Reference (`crm.db`)

```sql
-- Users & Credentials
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'sales_rep',
  google_tokens TEXT,
  drive_folder_id TEXT,
  drive_sheet_file_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leads & Pipeline
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  company TEXT,
  contact_number TEXT,
  email TEXT,
  source TEXT DEFAULT 'Website',
  stage TEXT NOT NULL DEFAULT 'New',
  deal_value REAL DEFAULT 0,
  priority TEXT DEFAULT 'Medium',
  next_followup_date TEXT,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Interaction Audit Timeline
CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'Call', 'Meeting', 'Email', 'Note', 'Stage Change'
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Action Items Checklist
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  lead_id INTEGER,
  title TEXT NOT NULL,
  due_date TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE SET NULL
);
```

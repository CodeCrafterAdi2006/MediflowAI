# Engineering Specifications — MediFlow AI (Hackathon Optimized)

This document defines the development environment, package configurations, database setup, and environment configurations for the MediFlow AI workspace.

---

## 1. Project Folder Structure

To avoid monorepo/workspace linking issues during a fast build, the client and server are completely **decoupled projects** inside the same repository. 

```text
├── client/                     # Presentation Layer (React Frontend)
│   ├── package.json
│   └── src/
│
├── server/                     # Backend API & Logic
│   ├── package.json
│   └── src/
│
├── .env.example
└── README.md
```

### 1.1 Local Run Instructions
To run the application, open two separate terminal instances:
```powershell
# Terminal 1: Backend Server
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

---

## 2. Backend Environment (Server)

The Express backend lives in `/server` and runs in TypeScript.

### 2.1 Developer Execution
* **Execution**: We use `tsx` (TypeScript Execute) to run files directly.
* **Hot Reloading**: Handled by Node's watch mode via `tsx watch`.

### 2.2 Server Scripts (`server/package.json`)
```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.39.0",
    "@types/multer": "^2.2.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^8.6.1",
    "google-auth-library": "^10.9.1",
    "googleapis": "^129.0.0",
    "jsonwebtoken": "^9.0.3",
    "multer": "^2.2.0"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.0"
  }
}
```

---

## 3. Frontend Environment (Client)

The React client lives in `/client` and is powered by Vite.

### 3.1 Stack
* **Build System**: Vite + React + TypeScript
* **Styling**: Tailwind CSS
* **Test Runner**: Vitest (Scaffolded but deferred for hackathon timeline)

### 3.2 Client Scripts (`client/package.json`)
```json
{
  "name": "client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.469.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.0.0",
    "@types/node": "^24.13.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "eslint": "^10.6.0",
    "typescript": "~6.0.2",
    "vite": "^8.1.1"
  }
}
```

---

## 4. Database Setup & RLS Schema (Supabase SQL Editor)

Instead of using the Supabase CLI, we manage database initialization by pasting schema code directly into the **Supabase Dashboard SQL Editor**.

### 4.1 SQL Editor Copy-Paste Initialization Script
Pasting this single script will construct all tables, foreign keys, constraints, and Row-Level Security (RLS) policies:

```sql
-- ==========================================
-- 1. Create Tables
-- ==========================================

-- User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  meal_times JSONB NOT NULL DEFAULT '{"breakfast": "08:00", "lunch": "13:00", "dinner": "20:00", "bedtime": "22:00"}'::jsonb,
  google_refresh_token TEXT, -- Plaintext storage is a hackathon-scope simplification.
  caregiver_name TEXT,
  caregiver_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  raw_ocr_text TEXT
);

-- Medicines
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  instructions TEXT,
  plain_explanation TEXT NOT NULL
);

-- Generated Schedule Slots
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
  time_of_day TIME NOT NULL,
  calendar_event_id TEXT
);

-- Dose logs
CREATE TABLE IF NOT EXISTS public.dose_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_slot_id UUID REFERENCES public.schedule_slots(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('taken', 'missed', 'skipped')) NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (schedule_slot_id, date)
);

-- ==========================================
-- 2. Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. RLS Security Policies
-- ==========================================

-- Profiles Policy
CREATE POLICY "Users can manage their own profile" 
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- Prescriptions Policy
CREATE POLICY "Users can manage their own prescriptions" 
  ON public.prescriptions FOR ALL USING (auth.uid() = user_id);

-- Medicines Policy
CREATE POLICY "Users can manage medicines on their prescriptions" 
  ON public.medicines FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.prescriptions 
      WHERE public.prescriptions.id = medicines.prescription_id 
      AND public.prescriptions.user_id = auth.uid()
    )
  );

-- Schedule Slots Policy
CREATE POLICY "Users can manage schedule slots on their medicines" 
  ON public.schedule_slots FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.medicines
      JOIN public.prescriptions ON public.prescriptions.id = medicines.prescription_id
      WHERE public.medicines.id = schedule_slots.medicine_id
      AND public.prescriptions.user_id = auth.uid()
    )
  );

-- Dose Logs Policy
CREATE POLICY "Users can manage dose logs on their schedule slots" 
  ON public.dose_logs FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.schedule_slots
      JOIN public.medicines ON public.medicines.id = schedule_slots.medicine_id
      JOIN public.prescriptions ON public.prescriptions.id = medicines.prescription_id
      WHERE public.schedule_slots.id = dose_logs.schedule_slot_id
      AND public.prescriptions.user_id = auth.uid()
    )
  );
```

---

## 5. Environment Variables & Mock Configurations

To completely de-risk live demo failures, **Google Calendar integration defaults to Mock mode** unless explicitly enabled by environment configuration.

### 5.1 Server Config (`server/.env`)
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Calendar Integration Configuration
ENABLE_REAL_GOOGLE_CALENDAR=false # Default to false for Mock/Demo mode
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

### 5.2 Client Config (`client/.env`)
```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

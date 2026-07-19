# Project Constitution — MediFlow AI

## 1. Prime Mission
To convert printed or typed prescription images into a simple, clear, and actionable daily medication schedule, explained in plain language and integrated with Google Calendar reminders.

## 2. Core Tech Stack
* **Frontend**: React + Vite (Single Page Application) + Tailwind CSS (vanilla CSS approach if Tailwind is not explicitly installed/needed, but user requested Tailwind CSS, so we'll use Tailwind CSS).
* **Backend**: Node.js + Express.js + TypeScript (for robust type safety).
* **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Supabase Storage).
* **AI/LLM & OCR**: Gemini API (acting as both the multimodal OCR and the structured data parser + plain language explanation generator).
* **Reminders & Scheduler**: Google Calendar API integration via backend OAuth.

## 3. Key Architecture Principles (Service-Layer Pattern)
* **Presentation Layer (Routes & Views)**: React frontend views, Express API routers and route controllers. Responsible for input validation, user input collection, and rendering states.
* **Service Layer (Business Logic)**: Functions for parsing, scheduling heuristics, missed dose checkers, and event aggregators. Framework-agnostic and unit-testable.
* **Data & Client Infrastructure Layer**: Supabase Client wrapper, Gemini API client, Google Calendar API client. Directly interacts with external systems and normalizes data types for the Service Layer.

## 4. Coding Conventions & Guardrails
* **No Diagnostic Language**: The system must explicitly state: "MediFlow AI is an informational assistant and does not provide medical advice or diagnoses. Verify all instructions with your doctor."
* **Type-Safety**: strict TypeScript config. All API responses must be strongly typed.
* **Error Handling**: Every external network call (Supabase, Gemini, Google Calendar) must have a fallback, a timeout, and structured error logs.
* **Secrets Management**: Secrets (`GEMINI_API_KEY`, `SUPABASE_KEY`, etc.) live in `.env` and are loaded via `dotenv`. Never hardcoded.

# MediFlow AI — Routing & Entry-Point Guide

**Branch:** `authentication`  
**Last updated:** 2026-07-31  
**Author:** AI Engineering

---

## Overview

This document covers the client-side routing decisions made during the `authentication` branch. It describes:

- The application's entry-point structure (landing page → login → app)
- How "Get Started" CTAs are wired to auth state
- Where each redirect originates and why
- A file-by-file reference for every routing-related component

---

## Route Map

| Path | Component | Who sees it | Notes |
|------|-----------|-------------|-------|
| `/` | `LandingPage` | Everyone | Default entry point — marketing page |
| `/login` | `LoginPage` | Unauthenticated users | Google OAuth consent trigger |
| `/app/upload` | `UploadPage` | Authenticated only | Protected by `ProtectedRoute` |
| `/app/review` | `ReviewPage` | Authenticated only | Protected by `ProtectedRoute` |
| `/app/dashboard` | `DashboardPage` | Authenticated only | Post-login landing destination |
| `/app/caregiver` | `CaregiverPage` | Authenticated only | Protected by `ProtectedRoute` |
| `/app/profile` | `ProfilePage` | Authenticated only | Protected by `ProtectedRoute` |
| `/landing` | — | Everyone | Alias redirect → `/` (keeps old links working) |
| `*` (anything else) | — | Everyone | Catch-all redirect → `/` |

---

## User Journey Flows

### Guest (not logged in)

```
Visits /
  └─ Sees LandingPage
       └─ Clicks "Get Started"  ──────────────────────────────┐
                                                               ▼
                                                         /login page
                                                               │
                                                    Clicks "Continue with Google"
                                                               │
                                               Google consent screen (OAuth)
                                                               │
                                         GET /api/auth/google/callback
                                         (code exchange, JWT cookie set)
                                                               │
                                              302 redirect → /app/dashboard ✓
```

### Authenticated user visiting the landing page

```
Visits /
  └─ Sees LandingPage
       ├─ Navbar shows "Log out" button (instead of "Get Started")
       └─ Clicks "Get Started" anywhere ──► /app/dashboard (skips /login)
```

### Authenticated user clicking Log out

```
On any /app/* page → clicks "Log out"
  └─ POST /api/auth/logout  (clears auth_token cookie)
  └─ AuthContext sets user = null
  └─ ProtectedRoute detects no user → Navigate to="/"
  └─ User lands on LandingPage ✓
```

### Unauthenticated user trying to access a protected route directly

```
Types /app/dashboard in browser
  └─ ProtectedRoute: isLoading=true → spinner
  └─ AuthContext: GET /api/auth/me → 401
  └─ ProtectedRoute: user=null → Navigate to="/"
  └─ User lands on LandingPage ✓
```

---

## Component Reference

### `App.tsx` — Route Tree
**Path:** `client/src/App.tsx`

Defines the full route tree. Key structure:

```tsx
<AuthProvider>              // wraps everything — auth state available everywhere
  <Routes>
    <Route path="/"       element={<LandingPage />} />    // entry point
    <Route path="/landing" element={<Navigate to="/" />} />  // alias
    <Route path="/login"  element={<LoginPage />} />

    <Route path="/app" element={<ProtectedRoute />}>      // gate
      <Route element={<AppLayout />}>                     // nav shell
        <Route index element={<Navigate to="upload" />} />
        <Route path="upload"    element={<UploadPage />} />
        <Route path="review"    element={<ReviewPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="caregiver" element={<CaregiverPage />} />
        <Route path="profile"   element={<ProfilePage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" />} />      // catch-all
  </Routes>
</AuthProvider>
```

---

### `ProtectedRoute.jsx` — Auth Gate
**Path:** `client/src/components/ProtectedRoute.jsx`

Wraps all `/app/*` routes. Behaviour:

| State | Action |
|-------|--------|
| `isLoading = true` | Renders a full-page spinner (waits for `/api/auth/me`) |
| `user = null` | `<Navigate to="/" replace />` — lands on LandingPage |
| `user` populated | Renders `<Outlet />` (the protected page) |

> [!IMPORTANT]
> The redirect target on logout/unauthenticated access is `/` (landing page), **not** `/login`.  
> This is intentional — the landing page is the entry point for all visitors. "Get Started" on the landing page routes guests to `/login`.

---

### `GetStartedButton.jsx` — Auth-Aware CTA
**Path:** `client/src/components/GetStartedButton.jsx`

A drop-in replacement for `<Link>` used on all landing page CTAs. Reads auth state and routes accordingly:

| Auth state | Navigates to |
|------------|-------------|
| `isLoading = true` | `/login` (safe fallback) |
| `user = null` (guest) | `/login` |
| `user` populated (authenticated) | `/app/dashboard` |

**Usage** (identical API to `<Link>`):
```jsx
import GetStartedButton from '../components/GetStartedButton.jsx'

<GetStartedButton className="btn btn-primary">
  Get Started <ArrowRight size={18} />
</GetStartedButton>
```

**Used in:**
- `Navbar.jsx` — desktop and mobile CTAs
- `Hero.jsx` — hero section primary button
- `CTA.jsx` — bottom call-to-action section

---

### `Navbar.jsx` — Landing Page Navigation
**Path:** `client/src/components/Navbar.jsx`

The navbar on `/` (LandingPage) is auth-aware. The CTA slot in the top-right and mobile menu shows:

| Auth state | Desktop CTA | Mobile menu CTA |
|------------|------------|-----------------|
| Guest | `GetStartedButton` → `/login` | `GetStartedButton` → `/login` |
| Authenticated | `Log out` button | `Log out` button |

This means an already-logged-in user visiting the landing page sees a clear logout option without being forced to navigate into the app.

---

### `AuthContext.jsx` — Global Auth State
**Path:** `client/src/context/AuthContext.jsx`

Provides the `useAuth()` hook to all components inside `<AuthProvider>`:

```jsx
const { user, isLoading, logout } = useAuth()
```

| Value | Type | Description |
|-------|------|-------------|
| `user` | `{ sub, email, name, picture } \| null` | Current session; `null` if guest |
| `isLoading` | `boolean` | `true` while `/api/auth/me` is in-flight on mount |
| `logout()` | `async function` | POSTs to `/api/auth/logout`, clears `user` |

On mount, `AuthContext` calls `GET /api/auth/me` with `credentials: 'include'` to restore an existing session from the `auth_token` HttpOnly cookie. This is the only session-restore mechanism — cookies are HttpOnly so JavaScript cannot read them directly.

---

### `AppLayout.jsx` — App Shell Navigation
**Path:** `client/src/app/AppLayout.jsx`

The navigation shell for all `/app/*` pages. Shows:
- MediFlow brand icon (links to `/` — the landing page)
- Tab navigation (Upload, Review, Dashboard, Caregiver, Profile)
- User avatar (Google profile picture or initial fallback)
- `Log out` button — calls `logout()` from `useAuth()`

After `logout()` is called, `user` becomes `null` and `ProtectedRoute` navigates to `/`.

---

## Adding a New Page

### Protected page (requires login)

1. Create `client/src/app/MyPage.jsx`
2. Add a route inside the `ProtectedRoute` block in `App.tsx`:
   ```tsx
   <Route path="my-page" element={<MyPage />} />
   ```
3. Add a nav tab entry to the `TABS` array in `AppLayout.jsx` if it needs a nav link.

### Public page (no login required)

1. Create the component anywhere in `src/pages/` or `src/app/`
2. Add a route **outside** the `ProtectedRoute` block in `App.tsx`:
   ```tsx
   <Route path="/my-public-page" element={<MyPublicPage />} />
   ```

---

## Environment Variables (Client)

| Variable | Purpose | Production value |
|----------|---------|-----------------|
| `VITE_API_URL` | Base URL for all API calls | Leave empty (same origin on Vercel) |

The `AuthContext` automatically uses `''` as the API base in production (`import.meta.env.PROD = true`) and `http://localhost:5000` in development.

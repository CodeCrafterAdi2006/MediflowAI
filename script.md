# 🎬 MediFlow AI — Official 3-Part Hackathon Demo Video Script

**Team**: `404_not_found` (Aditya, Arnav, Om)  
**Target Video Duration**: 4:00 – 4:30 minutes  
**Format**: 3 separate video clips recorded individually, then combined into one seamless video.  

---

## 📋 Production & Editing Guide (Before You Record)
1. **Screen Recording Tools**: Use **Loom** (free 5-min limit, easy download), **OBS Studio**, or **Windows + Shift + G** (Xbox Game Bar) / **Mac QuickTime**.
2. **Audio Quality**: Record in a quiet room. Speak clearly, confidently, and with enthusiasm! Judges evaluate presentation and communication heavily (15%).
3. **Combining Clips**: Aditya can import all 3 recorded video files into any free video editor (e.g., **CapCut**, **Clipchamp** built into Windows, or **iMovie**) and export as a single 1080p MP4 file.
4. **Live Site vs. Local**: Aditya should record his screen using the live Vercel link ([mediflow-ai-kappa.vercel.app](https://mediflow-ai-kappa.vercel.app/)) or localhost with the server running.

---

## 🎙️ PART 1: The Problem & Our AI Solution  
**Speaker**: **Arnav** (or Om)  
**Target Duration**: 1:00 minute  
**Visual on Screen**: Start with team pitch deck slide / title slide, then switch to the **MediFlow AI Landing Page**.

### 💡 Visual Cues & Actions
- [0:00 - 0:20] Show Title Slide or MediFlow AI Landing Page hero section.
- [0:20 - 0:40] Scroll down slightly to highlight the problem (messy prescriptions, missed doses).
- [0:40 - 1:00] Scroll to the "How it Works" section of the landing page.

### 📝 Word-for-Word Script
> **"Hello everyone! We are Team `404_not_found`, and we are thrilled to present our AI-First Hackathon project: MediFlow AI.**
>
> **Every year, medication non-adherence causes over 125,000 preventable deaths and costs the healthcare system 300 billion dollars. For elderly patients and individuals managing chronic illnesses, the journey from doctor's office to daily recovery is broken. Patients are handed messy, handwritten prescriptions filled with complex Latin abbreviations like 'TID' or 'BID', leading to dangerous dosing errors, forgotten pills, and accidental double-dosing.**
>
> **Existing reminder apps force patients to manually type in dozens of pill names and times—an overwhelming friction point that elderly users simply abandon.**
>
> **To solve this, we built MediFlow AI: an autonomous, AI-first medication adherence and caregiver protection platform. Instead of manual data entry, patients simply snap a photo of their prescription. Our multimodal AI reads the doctor's handwriting, translates complex medical jargon into plain English, safeguards sleep cycles, and keeps caregivers alerted in real-time.**
>
> **Now, I’ll hand it over to Aditya, our lead technical architect, to show you a live demonstration of our prototype and take you under the hood of our AI architecture!"**

---

## 💻 PART 2: Live Prototype Walkthrough & Deep-Dive Tech Architecture  
**Speaker**: **Aditya** (*Technical Lead*)  
**Target Duration**: 2:00 – 2:30 minutes  
**Visual on Screen**: Full screen share of the MediFlow AI web app ([mediflow-ai-kappa.vercel.app](https://mediflow-ai-kappa.vercel.app/) or localhost).

### 💡 Visual Cues & Actions
- **[1:00 - 1:25] The Upload & AI OCR Engine**:
  - Click **"Get Started"** on the landing page to open the Upload Wizard (`Step 1 of 4`).
  - Drag-and-drop a sample prescription image (use the generated test prescription image in your folder).
  - While it says *"Analyzing with AI..."*, explain the multimodal OCR engine and fallback architecture.
- **[1:25 - 1:55] The Review Page & Clinical Safety Features**:
  - When the Review Page loads, gesture/point your mouse to the **"In plain terms"** plain-language explanation box.
  - Point your mouse to the red **⚠️ High-Alert Medication Caution** badge (if visible on narrow therapeutic index drugs like anticoagulants or insulin).
  - Point to the **Sleep Boundary Warning badge** and explain how our algorithm protects sleep.
- **[1:55 - 2:20] The Interactive Schedule Dashboard**:
  - Click **"Confirm Schedule & Generate Calendar"** to transition to the Dashboard (`/app/dashboard`).
  - Scroll through today's interactive chronological timeline.
  - Click **"Log Dose"** on one pill and mark it as **"Taken"** (show the status chip updating live).
- **[2:20 - 3:30] Caregiver Alerts, Calendar Sync & Security Architecture**:
  - Click the **"Caregiver Portal"** tab or show how missed doses trigger alerts.
  - Click **"Download Apple / Google Calendar (.ics)"** to show the 1-click calendar sync.
  - Briefly summarize our security hardening (CORS, Supabase RLS, non-prescription image rejection).

### 📝 Word-for-Word Script
> **"Thanks! Let's see MediFlow AI in action. Here on our Upload Wizard, a patient or caregiver simply drags and drops a photo of a handwritten prescription or pill bottle label.**
>
> *(Drop image into dropzone)*
>
> **As we upload this image, our backend activates our Multimodal OCR Pipeline. Under the hood, we utilize Google's newest 2026 Frontier Gemini 3 Series and Proven Gemini 2.5 models. To guarantee 99.9% enterprise uptime and bypass rate-limits, we engineered an automatic API key rotation pool with multi-model failover, backed by Meta's Llama 3.3 on Groq AI.**
>
> *(Review Page loads)*
>
> **In seconds, the AI extracts every medication with surgical precision. But notice what makes MediFlow truly unique: first, our AI translates complex clinical instructions into 'Plain Language Summaries'—one simple sentence explaining what the drug does so patients never feel confused.**
>
> **Second, notice our built-in Clinical Safety Engine. If the user uploads a non-prescription image—like a random photo or object—our backend immediately rejects it. Furthermore, our AI actively screens for narrow-therapeutic-index drugs—like blood thinners or insulin—and flags them with a prominent red 'High-Alert Medication Caution' badge to prevent accidental overdoses.**
>
> **Third, our intelligent Scheduling Engine runs a Circadian Sleep Protection Algorithm. If a doctor prescribes a pill every 8 hours, traditional timers wake patients up at 3 AM. Our algorithm mathematically clamps dosages away from the user's sleep window, displaying a Sleep Boundary Warning while maintaining safe dosage intervals.**
>
> *(Click Confirm Schedule → Dashboard loads)*
>
> **Confirming takes us to the Patient Dashboard—a clean, chronological timeline of today's care. With one tap, a patient can log a dose as Taken, Missed, or Skipped. Notice how the adherence progress bar dynamically updates in real time!**
>
> *(Click Caregiver Portal or Download Calendar)*
>
> **For elderly independent living, we built an automated Caregiver Protection Loop. If a patient misses a critical dose by over an hour, our backend scheduler flags an alert on the Caregiver Portal for instant SMS and email follow-up. Finally, patients can export their entire regimen to Apple or Google Calendar with our 1-click `.ics` iCalendar generator.**
>
> **Our entire codebase is production-hardened: deployed on Vercel Serverless Functions with Supabase PostgreSQL, strict CORS whitelisting, and Row-Level Security policies. Now, let’s pass it to Om to discuss our real-world impact and future scalability!"**

---

## 🌍 PART 3: Real-World Impact, Scalability & Future Vision  
**Speaker**: **Om** (or Arnav)  
**Target Duration**: 1:00 minute  
**Visual on Screen**: Show the Architecture Diagram from `README.md` or return to the Landing Page hero section.

### 💡 Visual Cues & Actions
- [3:30 - 3:55] Show the Architecture Diagram or Impact statistics slide.
- [3:55 - 4:15] Switch to showing the mobile-responsive view of the dashboard (resize browser window or show mobile mockup).
- [4:15 - 4:30] Show the team name/logo slide and smile for the sign-off!

### 📝 Word-for-Word Script
> **"Thank you, Aditya! Let’s talk about why MediFlow AI is a game-changer for the future of healthcare.**
>
> **Our real-world impact centers on preventative care and elderly independence. By eliminating manual data entry and translating complex prescriptions into actionable daily routines, MediFlow AI directly targets the root cause of medication non-adherence. In hospital pilot settings, automated adherence systems like ours have been shown to reduce post-discharge hospital readmissions by up to 30%.**
>
> **From a business model and scalability perspective, MediFlow is designed as an API-first, cloud-native SaaS platform. Built on stateless Vercel Serverless Functions and Supabase Cloud PostgreSQL, our infrastructure scales automatically from ten users to ten million without server maintenance overhead.**
>
> **Our future roadmap includes three exciting expansions: first, direct EHR and pharmacy API integrations so prescriptions are ingested automatically at checkout; second, a WhatsApp and Telegram conversational reminder bot for users without smartphones; and third, smart pillbox hardware integration.**
>
> **With MediFlow AI, we aren't just reminding patients to take pills—we are building an intelligent, self-healing safety net that bridges the gap between doctors, patients, and caregivers.**
>
> **Thank you from Team `404_not_found`, and we look forward to answering your questions!"**

---

## 🎬 Checklist Before Submitting
- [ ] Video resolution is at least 1080p (1920x1080).
- [ ] Total runtime is between **3:30 and 4:30 minutes** (do not exceed 5 minutes!).
- [ ] All 3 audio tracks have similar volume levels (use CapCut/Clipchamp to normalize audio).
- [ ] Upload final MP4 to YouTube (Unlisted), Google Drive (Anyone with link can view), or Loom.
- [ ] Test the video playback link in an Incognito window before submitting!

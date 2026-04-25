# MediScribe AI — Full System Documentation
> Web-based medical audio-to-recommendation platform targeting Bulgaria & EU  
> Stack: TanStack Start · Supabase · OpenAI · DrugBank · BDA/EMA Drug Data

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [MVP Feature Modules](#4-mvp-feature-modules)
5. [End-to-End User Flow](#5-end-to-end-user-flow)
6. [Database Schema](#6-database-schema)
7. [Drug Data Sources](#7-drug-data-sources)
8. [NLP — Why It Exists & How It Works](#8-nlp--why-it-exists--how-it-works)
9. [Recommendation Engine](#9-recommendation-engine)
10. [Third-Party Services](#10-third-party-services)
11. [Security & Compliance](#11-security--compliance)
12. [Sprint Roadmap](#12-sprint-roadmap)
13. [Out of Scope for MVP](#13-out-of-scope-for-mvp)
14. [Competitive Landscape](#14-competitive-landscape)

---

## 1. Project Overview

MediScribe AI is a web application that records or ingests audio from a doctor's appointment, transcribes it, extracts clinical entities via NLP, runs safety checks against a patient's allergy and medication history, generates evidence-backed medicine recommendations for doctor approval, produces a structured SOAP note, and auto-fills all required medical documents.

**Core value proposition:** the only platform on the Bulgarian/EU market that combines ambient audio transcription, allergy-safe medicine recommendation, and document automation in a single self-hostable web app.

### The Problem It Solves

Doctors in Bulgaria spend an estimated 35–40% of appointment time on documentation. Audio is the natural interface for clinical capture, but the raw transcript is unstructured — it cannot be queried, checked for safety, or used to fill forms without structured NLP extraction. Current tools (DeepScribe, Freed, Glass Health) solve parts of this problem but none cover the full pipeline from audio → safe recommendation → document.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Meta-framework | TanStack Start (v1) | SSR + server functions, file-based routing, full-stack React |
| Routing | TanStack Router | Type-safe, file-based routes, first-class search params |
| Data fetching | TanStack Query (v5) | Caching, background sync, optimistic updates |
| In-browser reactive store | TanStack DB (v0.6) | Offline-first reactive stores with SQLite persistence |
| Database | Supabase (Postgres 15+) | Hosted Postgres, RLS, Storage, Auth, realtime, pgvector |
| ORM | Drizzle ORM | Type-safe SQL, Postgres + SQLite compatibility |
| Auth | Supabase Auth | Email/password, magic link, role-based sessions |
| Audio transcription | OpenAI Whisper API | Highest medical-vocabulary accuracy |
| NLP / AI | OpenAI GPT-4o (structured output) | Entity extraction + recommendation generation |
| Drug interaction check | DrugBank API | DDI checker + allergy cross-reactive module |
| Semantic search | Supabase pgvector (HNSW) | Find PubMed evidence for recommendations |
| Styling | Tailwind CSS v4 | Utility-first, co-located with components |
| PDF export | `window.print()` / Puppeteer | Server-side PDF generation for documents |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
│                                                                 │
│  TanStack Router ─── TanStack Query ─── TanStack DB (cache)    │
│         │                  │                    │               │
│     Page views         API mutations       Offline store        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│              TANSTACK START SERVER (Node.js)                    │
│                                                                 │
│   Server Functions ─ Auth middleware ─ Rate limiter             │
│         │                                                       │
│   ┌─────┴──────┐   ┌────────────┐   ┌──────────────────────┐   │
│   │ Whisper API│   │ GPT-4o API │   │  DrugBank API        │   │
│   │ (OpenAI)   │   │ (OpenAI)   │   │  (DDI + Allergy)     │   │
│   └────────────┘   └────────────┘   └──────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        SUPABASE                                 │
│                                                                 │
│  Postgres 15+ ── pgvector ── RLS ── Storage ── Realtime         │
│                                                                 │
│  Tables: profiles, patients, appointments, transcripts,         │
│          extracted_entities, recommendations, documents,        │
│          drug_catalogue, allergy_safety_checks, audit_log,      │
│          articles (+ embeddings), search_cache                  │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    OFFLINE DATA (SQLite / Supabase)              │
│                                                                 │
│  drug_catalogue ← BDA CSV (Bulgarian Drug Agency)              │
│  drug_catalogue ← EMA Article 57 JSON (EU medicines)           │
│  articles       ← PubMed sync (NCBI API + embeddings)          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
Audio (mic/upload)
  → Whisper API → raw transcript stored in transcripts table
  → GPT-4o structured output → extracted_entities rows created
  → Patient history loaded from patients/patient_allergies/patient_medications
  → DrugBank API checks each candidate drug → allergy_safety_checks rows
  → GPT-4o recommendation prompt (cleared drugs only) → recommendations rows
  → Doctor approves → appointment_documents generated (SOAP + prescription)
  → PDF exported → storage_path saved → audit_log entry created
```

---

## 4. MVP Feature Modules

### Module 1 — Audio Capture & Transcription

**Goal:** Record or upload appointment audio and convert it to a searchable transcript.

- In-browser recording via `MediaRecorder API` (no external plugin needed)
- File upload support: MP3, WAV, M4A
- Audio streamed to OpenAI Whisper API (or self-hosted whisper.cpp)
- Raw transcript displayed with timestamps
- Transcript stored in `transcripts` table linked to `appointments`
- Language detection (Bulgarian `bg` and English `en` primary targets)

**Routes:** `/session/:id/record` → `/session/:id/transcribe`

---

### Module 2 — Clinical Entity Extraction (NLP)

**Goal:** Convert raw transcript text into structured clinical fields.

- Full transcript posted to GPT-4o with a strict JSON schema system prompt
- Extracted fields: symptoms, duration, severity, diagnosis hints, stated allergies, current medications, chronic conditions, doctor-suggested drugs, negations
- Each entity stored as a separate row in `extracted_entities` with `negated` boolean
- Doctor reviews all extracted entities in a confirmation UI before any downstream action
- Entities can be manually added, edited, or deleted by the doctor

**Routes:** `/session/:id/entities`

---

### Module 3 — Allergy & Drug History Safety Check

**Goal:** Ensure no recommended drug conflicts with known patient data.

- Load `patient_allergies`, `patient_medications`, `patient_conditions` from Supabase
- For each candidate drug, call DrugBank DDI + Allergy API
- Results stored in `allergy_safety_checks` with `flag: safe | warning | contraindicated`
- UI blocks progression if any `contraindicated` flag exists — doctor must resolve first
- All CONTRAINDICATED drugs are excluded from the recommendation prompt input

**Routes:** `/session/:id/safety`

---

### Module 4 — Medicine Recommendation Engine

**Goal:** Suggest the safest, most appropriate medications for doctor approval.

- Only `safe` or `warning`-flagged drugs are passed to the LLM
- GPT-4o prompt includes: extracted entities, cleared drug pool, patient history, EU drug scope constraint
- Returns ranked list (max 3): drug name, ATC code, dosage, frequency, rationale, confidence level
- Each recommendation stored in `recommendations` with status `pending_approval`
- Doctor must explicitly click Approve or Reject for every recommendation
- Approved recommendations trigger audit_log entry
- `recommendation_evidence` table links each recommendation to matching PubMed articles via pgvector semantic search

**Routes:** `/session/:id/recommendations`

---

### Module 5 — Appointment Summary (SOAP Note)

**Goal:** Auto-generate a structured visit summary from all session data.

- GPT-4o composes SOAP format: Subjective / Objective / Assessment / Plan
- Pulls from: transcript, confirmed entities, approved recommendations, patient history
- Doctor inline-edits the draft before finalising
- Stored in `appointment_documents` with `doc_type: soap_note`
- Export as PDF via browser print or Puppeteer

**Routes:** `/session/:id/summary`

---

### Module 6 — Document Auto-Fill

**Goal:** Populate standard Bulgarian medical forms automatically.

- Templates: prescription pad (рецепта), referral letter (направление), sick note (болничен лист)
- Extracted entities mapped to form fields automatically
- Doctor reviews and confirms each form before finalising
- Stored in `appointment_documents`, exported as PDF
- PDF `storage_path` saved in Supabase Storage

**Routes:** `/session/:id/documents`

---

### Module 7 — Patient Profile Management

**Goal:** Maintain a lightweight patient record for safety checks and document pre-fill.

- Create/edit patient: name, DOB, `egn_hash` (hashed EGN — never store raw), gender
- Manage allergy list (`patient_allergies`), chronic conditions (`patient_conditions`), current medications (`patient_medications`)
- Search patients by name (GIN full-text index)
- Patient selected at session start; all downstream checks reference this record

**Routes:** `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit`

---

### Module 8 — Auth & Role Management

**Goal:** Secure the app so only authorised clinical staff can access patient data.

- Supabase Auth: email/password login, magic link option
- Roles: `doctor` (full patient + session access), `admin` (user management + reports), `nurse` (read-only on assigned patients)
- All routes protected by TanStack Router `beforeLoad` guards that check `profiles.role`
- JWT contains role claim — server functions validate it before any DB operation

**Routes:** `/login`, `/settings/profile`, `/admin/users`

---

## 5. End-to-End User Flow

```
① Doctor logs in (Supabase Auth)
         ↓
② Selects existing patient OR creates new patient profile
         ↓
③ Starts new appointment session → status: "pending"
         ↓
④ Records audio in-browser OR uploads audio file
         ↓
⑤ Whisper transcribes audio → transcript saved → status: "transcribed"
         ↓
⑥ GPT-4o extracts clinical entities → doctor reviews & confirms
         ↓
⑦ DrugBank runs allergy + DDI check on all candidate drugs
         ↓  ← CONTRAINDICATED drugs blocked here
⑧ GPT-4o generates ranked recommendations (cleared drugs only)
         ↓
⑨ Doctor approves/rejects each recommendation → audit_log entry
         ↓
⑩ SOAP note auto-generated → doctor edits → finalised
         ↓
⑪ Medical forms auto-filled → doctor signs off → PDF exported
         ↓
⑫ Appointment status → "completed" → full record in Supabase
```

---

## 6. Database Schema

### Tables Overview

| # | Table | Description |
|---|---|---|
| 1 | `profiles` | Doctor/nurse/admin profiles extending `auth.users` |
| 2 | `patients` | Internal patient registry (hashed EGN, not raw) |
| 3 | `patient_allergies` | One row per allergy, with ATC code + severity |
| 4 | `patient_conditions` | Chronic/historical conditions with ICD-10 codes |
| 5 | `patient_medications` | Current medications with ATC codes |
| 6 | `appointments` | Core session: patient + doctor + recording + status |
| 7 | `transcripts` | Whisper output, full-text indexed |
| 8 | `extracted_entities` | NLP entities with `negated` boolean |
| 9 | `drug_catalogue` | BDA + EMA offline drug data, keyed on ATC code |
| 10 | `allergy_safety_checks` | DrugBank results per drug per appointment |
| 11 | `recommendations` | LLM drug suggestions with approval workflow |
| 12 | `appointment_documents` | SOAP, prescriptions, referrals, discharge notes |
| 13 | `audit_log` | Immutable log — service role insert, own-read only |
| 14 | `articles` | PubMed articles with pgvector embeddings |
| 15 | `authors` | Article authors |
| 16 | `article_authors` | Many-to-many articles ↔ authors |
| 17 | `keywords` | PubMed MeSH keywords |
| 18 | `article_keywords` | Many-to-many articles ↔ keywords |
| 19 | `search_cache` | PubMed query cache with 7-day TTL |
| 20 | `recommendation_evidence` | Links recommendations to PubMed articles via similarity score |

### RLS Policy Pattern

Every patient-linked table uses a join-based policy, not a direct `user_id` column. This means a doctor only sees data that belongs to patients they created:

```sql
-- Example: extracted_entities
using (
  exists (
    select 1 from appointments
    join patients on patients.id = appointments.patient_id
    where appointments.id = extracted_entities.appointment_id
      and appointments.doctor_id = auth.uid()
  )
)
```

This silently returns zero rows for unauthorised access — no 403, no data leakage.

### Key Design Decisions

- **All PKs are UUID** — Supabase standard, prevents enumeration attacks
- **`egn_hash`** — Bulgarian EGN is GDPR special category data. Store SHA-256 hash only
- **`negated` boolean on `extracted_entities`** — critical: "no fever" must not be treated as "fever present"
- **`audit_log` uses BIGSERIAL** — sequential IDs ensure tamper-evident ordering for regulatory review
- **`embedding vector(1536)`** on `articles` — OpenAI `text-embedding-3-small` enables semantic evidence search
- **HNSW index** on embeddings — `ivfflat` is faster to build but HNSW has better recall for medical search
- **`search_cache.expires_at`** — auto-purge stale PubMed cache after 7 days with a scheduled Supabase function

### Semantic Search Function

```sql
select * from match_articles(
  query_embedding := '[...]'::vector,
  match_threshold := 0.75,
  match_count     := 5
);
```

Returns the top 5 most similar PubMed articles with cosine similarity scores — used to populate `recommendation_evidence` after every approved recommendation.

---

## 7. Drug Data Sources

### 7.1 Bulgaria — Bulgarian Drug Agency (BDA)

**URL:** `https://www.bda.bg/en/registers/3076-register-of-pharmaceutical-products-2`

- Official register of all medicines with Marketing Authorisation in Bulgaria
- Provides: product name, active substance, ATC code, dosage form, MAH, prescription status
- Format: downloadable Excel/CSV (no public REST API as of 2026)
- Also provides: SmPC PDFs per drug — contains dosage, contraindications, allergy info
- **Action:** Download CSV → parse → populate `drug_catalogue` with `source: 'bda'` and `authorised_bg: true`

### 7.2 EU — European Medicines Agency (EMA)

**EMA Article 57 Database:**
- Covers all EEA-authorised medicines
- Fields: INN, ATC code, product name, MAH, authorisation country, orphan/biosimilar/generic flags
- Format: downloadable JSON/CSV from European Open Data Portal
- **Action:** Download JSON → populate `drug_catalogue` with `source: 'ema'` and `authorised_eu: true`

**BioMCP (local EMA sync tool):**

```bash
biomcp ema sync --region eu
```

Auto-downloads six EMA human-medicine JSON feeds locally. Free, no per-request cost. Useful for keeping the local catalogue updated.

### 7.3 Drug Interaction & Allergy Data — DrugBank API

- **DDI Checker endpoint:** given two drugs, returns interaction severity + mechanism
- **Allergy module:** given a known allergen (e.g. penicillin), returns all cross-reactive drugs
- Coverage: EU-compatible, uses ATC and INN
- Licence: commercial (academic/startup tiers available)
- **This is the only paid data source required for the safety layer**

### 7.4 WHO ATC Classification (Free)

- Universal drug classification standard used across all BDA and EMA products
- ATC code is the **primary key** linking your Bulgarian catalogue to EU-wide interaction databases
- Download from WHO Collaborating Centre for Drug Statistics Methodology

### 7.5 Recommended Data Loading Strategy

```
Startup / weekly cron:
  1. Download BDA CSV → upsert drug_catalogue (source=bda)
  2. Run biomcp ema sync → upsert drug_catalogue (source=ema)
  3. Merge on atc_code → set authorised_bg / authorised_eu flags

At recommendation time (live):
  4. Call DrugBank DDI API for each candidate drug pair
  5. Call DrugBank Allergy API for patient's known allergens
  6. Store results in allergy_safety_checks
```

---

## 8. NLP — Why It Exists & How It Works

### Why NLP Is Non-Negotiable

After Whisper transcribes the appointment audio, the result is a wall of unstructured text:

> *"Пациентът дойде с кашлица от три дни, лека температура, без известни алергии освен пеницилин. Взима метформин за диабет тип 2. Вероятно бактериална инфекция — помислете за амоксицилин или макролид."*

A database cannot query "kашлица" as a symptom, cannot flag "пеницилин" as an allergy, and cannot fill a prescription form from this text. NLP converts this into structured JSON:

```json
{
  "symptoms": [
    { "value": "cough", "duration": "3 days", "negated": false },
    { "value": "fever", "severity": "mild", "negated": false }
  ],
  "allergies": [
    { "substance": "penicillin", "certainty": "confirmed", "negated": false }
  ],
  "current_medications": [
    { "drug": "metformin", "dose": "unknown", "indication": "Type 2 Diabetes" }
  ],
  "chronic_conditions": ["Type 2 Diabetes"],
  "stated_diagnosis": "bacterial infection",
  "doctor_suggested_drugs": ["amoxicillin", "macrolide"],
  "negations": ["no other known allergies"]
}
```

**Without this structured output, none of the downstream pipeline works:**
- No allergy check (you don't know what the allergy is)
- No drug interaction check (you don't know what the patient is already taking)
- No recommendation (you don't know what the symptoms are)
- No document fill (you don't know what to put in each field)

### The Negation Problem

Medical NLP must detect negation precisely:

| Transcript phrase | Naive result | Correct result |
|---|---|---|
| "no fever" | symptom: fever | symptom: fever (negated=true) |
| "denies chest pain" | symptom: chest pain | symptom: chest pain (negated=true) |
| "not allergic to sulfa" | allergy: sulfa | allergy: sulfa (negated=true) |
| "allergic to penicillin except..." | allergy: penicillin | allergy: penicillin (negated=false) |

The `negated` boolean on `extracted_entities` captures this and prevents false positives in the safety check.

### NLP Implementation for MVP

**Use GPT-4o with JSON structured output mode.** No separate NLP service needed.

```typescript
const systemPrompt = `
You are a clinical data extraction assistant. 
Extract all clinical entities from the transcript below.
Return ONLY valid JSON matching this schema exactly.
Handle Bulgarian and English text. Detect negations precisely.
`;

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_schema", json_schema: clinicalEntitySchema },
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user",   content: transcript.raw_text }
  ]
});
```

**Why GPT-4o for MVP:**
- Zero infrastructure overhead
- Handles Bulgarian language natively
- Understands medical abbreviations and shorthand
- Same API used for recommendations — one vendor
- Structured output mode guarantees valid JSON matching your schema

**Phase 2 upgrade:** Azure Text Analytics for Health — deterministic, auditable, GDPR-compliant EU data centres, separate billing per record.

---

## 9. Recommendation Engine

### Safety-First Pipeline

The recommendation engine **never suggests a drug before the safety check clears it.**

```
Step 1: Gather candidate drugs
  - From doctor_suggested_drugs (NLP extracted)
  - From drug_catalogue WHERE ATC class matches diagnosis

Step 2: Safety filter (DrugBank API)
  FOR each candidate_drug:
    check_allergy(candidate_drug, patient_allergies)  → safe | warning | contraindicated
    check_ddi(candidate_drug, patient_medications)    → safe | warning | contraindicated
    store result in allergy_safety_checks

Step 3: Build cleared_drugs list
  cleared_drugs = candidates WHERE flag != 'contraindicated'

Step 4: LLM recommendation (GPT-4o)
  Input: extracted_entities + cleared_drugs + patient_history
  Output: ranked recommendations JSON

Step 5: Doctor approval gate
  Each recommendation.status = 'pending_approval'
  Doctor clicks Approve → status = 'approved', approved_by = auth.uid()
  Doctor clicks Reject  → status = 'rejected', rejection_note = "..."

Step 6: Evidence linking
  For each approved recommendation:
    embed(drug_name + rationale) → query match_articles()
    insert recommendation_evidence rows with similarity scores
```

### Recommendation System Prompt

```
System:
You are a clinical decision support tool operating in Bulgaria under EU pharmaceutical regulations.

Rules (non-negotiable):
1. Only suggest drugs from the cleared_drugs list provided — never suggest drugs outside it
2. Always include the ATC code for every suggested drug
3. Provide a rationale tied to specific symptoms or diagnosis
4. If fewer than 1 safe option exists, respond with an empty recommendations array and explain why
5. This is decision SUPPORT — always include "for doctor consideration" framing
6. Dosage must reference Bulgarian/EU standard protocols

Return valid JSON only.

Input:
- Extracted entities: {entities_json}
- Cleared drugs (passed all safety checks): {cleared_drugs_json}
- Patient history: {patient_history_json}
```

### Recommendation JSON Schema

```json
{
  "recommendations": [
    {
      "rank": 1,
      "drug_name": "Azithromycin",
      "atc_code": "J01FA10",
      "dosage": "500mg Day 1, then 250mg Days 2-5",
      "frequency": "once daily",
      "route": "oral",
      "rationale": "Macrolide appropriate for community-acquired bacterial infection; avoids penicillin class due to confirmed allergy",
      "confidence": "high",
      "warnings": []
    }
  ],
  "notes": "Amoxicillin excluded due to cross-reactivity with confirmed penicillin allergy."
}
```

---

## 10. Third-Party Services

| Service | Role | Cost Model | GDPR |
|---|---|---|---|
| OpenAI Whisper API | Audio transcription | Per minute | Via DPA |
| OpenAI GPT-4o | NLP extraction + recommendations | Per token | Via DPA |
| OpenAI Embeddings | PubMed article semantic search | Per token | Via DPA |
| DrugBank API | DDI + allergy cross-check | Commercial licence | Via DPA |
| Supabase | Database, Auth, Storage, pgvector | Usage-based | EU regions available |
| BDA (Bulgarian Drug Agency) | Bulgarian drug registry CSV | Free public data | N/A |
| EMA / BioMCP | EU drug registry JSON | Free public data | N/A |
| WHO ATC | Drug classification codes | Free download | N/A |
| NCBI PubMed | Medical literature via API | Free (rate-limited) | N/A |

**No custom ML models are trained or hosted.** Every AI component is an API call. This keeps the regulatory surface minimal during the MVP pilot phase.

---

## 11. Security & Compliance

### GDPR (Bulgaria + EU)

- Patient health data is **special category data** under GDPR Article 9 — requires explicit consent and a legal basis before processing
- **Data Processing Agreements (DPAs)** must be signed with OpenAI, DrugBank, and Supabase before any patient data is sent to them
- **`egn_hash`** — Bulgarian EGN must never be stored in plaintext. Store only a SHA-256 hash
- **Audio files** are personal data (voice biometrics) — delete raw audio after transcription, or store with encryption and an explicit retention policy (recommended: 30 days max without patient consent for longer)
- **Data minimisation** — only send the minimum data needed to each API (e.g. send the transcript text, not patient name, to GPT-4o)

### Supabase RLS Security

- Every table has Row Level Security enabled
- Patient-linked tables use join-based policies (not direct `user_id` columns) — unauthorised queries return zero rows silently
- `audit_log` is INSERT-only for server role; doctors can only SELECT their own rows
- `drug_catalogue` and `articles` are read-only for all authenticated users

### Application Security

- All routes protected by TanStack Router `beforeLoad` guards checking `profiles.role`
- Server functions validate JWT role claim before any DB operation
- No patient data stored in browser `localStorage` or `sessionStorage` (blocked in Supabase sandboxed iframes anyway) — TanStack DB uses in-memory state only
- HTTPS enforced; Supabase Storage URLs are signed with short expiry for document downloads

### Regulatory (SaMD — Software as a Medical Device)

- **During MVP pilot:** the doctor approves every single recommendation — the software is a "decision support" tool, not an autonomous prescriber. This keeps it below the SaMD device classification threshold under EU MDR.
- **Post-pilot:** if the app starts influencing treatment without explicit doctor approval at each step, it becomes an SaMD Class IIa/IIb device requiring CE marking under EU MDR 2017/745 and potentially a Notified Body audit.
- **FDA:** if distributing to US users, a 510(k) / De Novo submission under SaMD Class II would be required. Not needed for Bulgaria-only MVP.
- **Audit log** is mandatory for any future regulatory submission — every action traceable to a specific user, timestamp, and data state.

---

## 12. Sprint Roadmap

| Sprint | Duration | Goal | Deliverable |
|---|---|---|---|
| 0 — Foundation | 1 week | TanStack Start scaffold, Supabase schema, Auth, CI/CD pipeline | Running app with login |
| 1 — Audio | 2 weeks | MediaRecorder, file upload, Whisper integration, transcript view | Working transcription |
| 2 — NLP | 2 weeks | GPT-4o entity extraction, doctor review/edit UI, entity storage | Structured entities from audio |
| 3 — Patients | 2 weeks | Patient profile CRUD, allergy/condition/medication management | Patient registry |
| 4 — Safety | 2 weeks | DrugBank integration, allergy + DDI checks, safety flag UI | Safe drug filtering |
| 5 — Recs | 2 weeks | Recommendation engine, approval workflow, audit log | Doctor-approved recommendations |
| 6 — Docs | 2 weeks | SOAP summary, document auto-fill, PDF export | Complete session documents |
| 7 — Data | 1 week | BDA CSV import, EMA BioMCP sync, drug_catalogue population | Bulgarian + EU drug data live |
| 8 — QA | 2 weeks | End-to-end testing, GDPR review, security audit, performance | Pilot-ready MVP |
| **Total** | **~14 weeks** | | **Functional MVP ready for clinical pilot** |

---

## 13. Out of Scope for MVP

- Multi-tenant SaaS billing and subscription management
- EHR system integrations (Epic, Cerner, НЗИС)
- Real-time collaborative sessions (two doctors on one appointment)
- Mobile native app (iOS/Android)
- Automated prescribing without explicit doctor approval at every step
- Multi-language audio beyond Bulgarian and English
- DICOM / medical imaging integration
- Automated sick leave or referral submission to НЗОК (National Health Insurance Fund)
- CE marking / EU MDR conformity assessment (post-MVP)

---

## 14. Competitive Landscape

| Feature | DeepScribe | Glass Health | Freed AI | MediScribe AI (MVP) |
|---|---|---|---|---|
| Ambient audio transcription | ✅ | ✅ | ✅ | ✅ |
| Bulgarian language support | ❌ | ❌ | ❌ | ✅ |
| Medicine recommendation | ❌ | Partial (A&P) | ❌ | ✅ |
| Allergy / DDI check | ❌ | ❌ | ❌ | ✅ |
| Patient history integration | ❌ | ❌ | ❌ | ✅ |
| SOAP note auto-generation | ✅ | ✅ | ✅ | ✅ |
| Document auto-fill (forms) | ✅ | Partial | ❌ | ✅ |
| PubMed evidence linking | ❌ | ❌ | ❌ | ✅ |
| BDA / EU drug catalogue | ❌ | ❌ | ❌ | ✅ |
| Self-hostable | ❌ | ❌ | ❌ | ✅ |
| Open GDPR DPA | Partial | Partial | Partial | ✅ (required) |

**Gap summary:** No existing tool covers the full pipeline from Bulgarian-language audio transcription → allergy-safe recommendation → document generation. The closest competitors (Glass Health + DeepScribe) each cover roughly half the feature set and have no BDA/EMA drug data integration.

---

*Document version: 1.0 — April 2026*  
*Prepared for: MediScribe AI MVP Development*  
*Target market: Bulgaria (primary), EU (secondary)*

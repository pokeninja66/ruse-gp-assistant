-- =========================================================
-- MedPortal BG — V2 Migration Script
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =========================================================


-- ─────────────────────────────────────────────────────────
-- 1. Add UIN field to profiles
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS uin text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS practice_name text;


-- ─────────────────────────────────────────────────────────
-- 2. Extended patient info (EGN, address, insurance, GP)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_extended_info (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id   uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  egn_hash     text,           -- SHA-256 of EGN, never store plaintext
  citizenship  text,
  address      text,
  insurance_status text CHECK (insurance_status IN ('insured', 'uninsured', 'unknown')) DEFAULT 'unknown',
  gp_name      text,
  notes        text,
  created_at   timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at   timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.patient_extended_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage patient extended info"
  ON public.patient_extended_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_extended_info.patient_id
        AND patients.created_by = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 3. Patient Anamnesis (per appointment)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patient_anamnesis (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  symptoms        jsonb DEFAULT '[]',        -- [{name, severity, duration}]
  free_text       text,                      -- patient's own words
  onset_description text,                   -- "started 3 days ago..."
  comorbidities   text,                      -- past illnesses, surgeries
  risk_factors    text,                      -- smoking, family history etc.
  current_meds_text text,                    -- free text for medications at anamnesis time
  allergies_text  text,                      -- free text for allergies at anamnesis time
  ai_summary      text,                      -- AI-structured summary
  ai_generated_at timestamptz,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.patient_anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage anamnesis"
  ON public.patient_anamnesis FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = patient_anamnesis.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 4. Appointment Vitals
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointment_vitals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  blood_pressure  text,      -- e.g. "120/80 mmHg"
  pulse           integer,   -- bpm
  temperature     numeric(4,1), -- °C
  spo2            numeric(4,1), -- % SpO2
  weight          numeric(5,1), -- kg
  blood_glucose   numeric(5,1), -- mmol/L
  urine_findings  text,
  other_quick_tests text,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.appointment_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage vitals"
  ON public.appointment_vitals FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_vitals.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 5. Physical Exam / Status
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointment_physical_exam (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id    uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  general_condition text,    -- general state, consciousness, skin
  local_status      jsonb DEFAULT '{}', -- {zone, pain, edema, redness, mobility}
  objective_status  text,    -- main clinical description
  doctor_observations text,  -- clinical impression
  exam_summary      text,    -- brief summary
  created_at        timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at        timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.appointment_physical_exam ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage physical exam"
  ON public.appointment_physical_exam FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_physical_exam.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 6. Confirmed Appointment Diagnosis
--    (separate from AI extracted_entities)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointment_diagnoses (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  diagnosis_name  text NOT NULL,
  icd10_code      text,
  source          text CHECK (source IN ('ai_suggested', 'doctor_confirmed', 'doctor_manual')) DEFAULT 'doctor_confirmed',
  confidence      integer,    -- 0-100, only for ai_suggested
  notes           text,
  is_final        boolean DEFAULT false,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.appointment_diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage diagnoses"
  ON public.appointment_diagnoses FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_diagnoses.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 7. Specialist Referrals
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.specialist_referrals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  specialist_type text NOT NULL,  -- e.g. "Cardiologist", "Dermatologist"
  reason          text,
  urgency         text CHECK (urgency IN ('routine', 'urgent', 'emergency')) DEFAULT 'routine',
  notes           text,
  status          text CHECK (status IN ('draft', 'issued')) DEFAULT 'draft',
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.specialist_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage referrals"
  ON public.specialist_referrals FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = specialist_referrals.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 8. Test Orders
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_orders (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  test_name       text NOT NULL,
  test_type       text CHECK (test_type IN ('blood', 'urine', 'imaging', 'ecg', 'microbiology', 'other')) DEFAULT 'other',
  notes           text,
  status          text CHECK (status IN ('ordered', 'completed', 'cancelled')) DEFAULT 'ordered',
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.test_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage test orders"
  ON public.test_orders FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = test_orders.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 9. Test Results
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.test_results (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  test_order_id   uuid REFERENCES public.test_orders(id) ON DELETE SET NULL,
  test_name       text NOT NULL,
  result_text     text,
  result_value    numeric,
  unit            text,
  reference_range text,
  is_abnormal     boolean DEFAULT false,
  notes           text,
  result_date     date,
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage test results"
  ON public.test_results FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = test_results.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 10. Confirmed Therapy Plans
--     (extends existing recommendations table)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.therapy_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  plan_text       text NOT NULL,      -- full confirmed therapy plan
  source          text CHECK (source IN ('ai_suggested', 'doctor_manual')) DEFAULT 'doctor_manual',
  patient_instructions text,          -- lifestyle, follow-up instructions
  duration_days   integer,
  confirmed_at    timestamptz DEFAULT timezone('utc', now()),
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.therapy_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Doctors can manage therapy plans"
  ON public.therapy_plans FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = therapy_plans.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────
-- 11. Indexes for performance
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patient_anamnesis_appointment ON public.patient_anamnesis(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_vitals_appointment ON public.appointment_vitals(appointment_id);
CREATE INDEX IF NOT EXISTS idx_physical_exam_appointment ON public.appointment_physical_exam(appointment_id);
CREATE INDEX IF NOT EXISTS idx_specialist_referrals_appointment ON public.specialist_referrals(appointment_id);
CREATE INDEX IF NOT EXISTS idx_test_orders_appointment ON public.test_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_test_results_appointment ON public.test_results(appointment_id);
CREATE INDEX IF NOT EXISTS idx_therapy_plans_appointment ON public.therapy_plans(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_diagnoses_appointment ON public.appointment_diagnoses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_extended_info_patient ON public.patient_extended_info(patient_id);

-- Done! All v2 tables are ready.

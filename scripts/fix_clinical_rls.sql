-- Final fix for clinical data persistence and RLS
-- This ensures that doctors can save and read all session-related data

-- 1. Enable RLS for all clinical tables
ALTER TABLE IF EXISTS public.patient_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_physical_exam ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.therapy_plans ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if a doctor owns an appointment
CREATE OR REPLACE FUNCTION public.check_doctor_appointment(appt_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id = appt_id AND doctor_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create policies for each table
-- ANAMNESIS
DROP POLICY IF EXISTS "Doctors can manage anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Doctors can manage anamnesis" ON public.patient_anamnesis
  FOR ALL USING (public.check_doctor_appointment(appointment_id));

-- VITALS
DROP POLICY IF EXISTS "Doctors can manage vitals" ON public.appointment_vitals;
CREATE POLICY "Doctors can manage vitals" ON public.appointment_vitals
  FOR ALL USING (public.check_doctor_appointment(appointment_id));

-- PHYSICAL EXAM
DROP POLICY IF EXISTS "Doctors can manage physical exam" ON public.appointment_physical_exam;
CREATE POLICY "Doctors can manage physical exam" ON public.appointment_physical_exam
  FOR ALL USING (public.check_doctor_appointment(appointment_id));

-- DIAGNOSES
DROP POLICY IF EXISTS "Doctors can manage diagnoses" ON public.appointment_diagnoses;
CREATE POLICY "Doctors can manage diagnoses" ON public.appointment_diagnoses
  FOR ALL USING (public.check_doctor_appointment(appointment_id));

-- THERAPY PLANS
DROP POLICY IF EXISTS "Doctors can manage therapy plans" ON public.therapy_plans;
CREATE POLICY "Doctors can manage therapy plans" ON public.therapy_plans
  FOR ALL USING (public.check_doctor_appointment(appointment_id));

-- 4. Ensure foreign keys for better performance and integrity
-- If any of these fail because they already exist, it's fine.
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.patient_anamnesis ADD CONSTRAINT fk_anamnesis_appt FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL; END;
    
    BEGIN
        ALTER TABLE public.appointment_vitals ADD CONSTRAINT fk_vitals_appt FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL; END;

    BEGIN
        ALTER TABLE public.appointment_physical_exam ADD CONSTRAINT fk_physical_appt FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL; END;
END $$;

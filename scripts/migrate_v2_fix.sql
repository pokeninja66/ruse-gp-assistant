-- Fix for recordings relationship and policies

-- 1. Add patient_id to recordings if missing, and ensure foreign keys
DO $$
BEGIN
    -- Add patient_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recordings' AND COLUMN_NAME = 'patient_id') THEN
        ALTER TABLE public.recordings ADD COLUMN patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;
    END IF;

    -- Ensure appointment_id column exists and is linked
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'recordings' AND COLUMN_NAME = 'appointment_id') THEN
        ALTER TABLE public.recordings ADD COLUMN appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Update existing recordings to have patient_id from their appointments
UPDATE public.recordings
SET patient_id = appointments.patient_id
FROM public.appointments
WHERE recordings.appointment_id = appointments.id
  AND recordings.patient_id IS NULL;

-- 3. Fix policies that might be failing due to field name mismatches
-- Ensure "doctor_id" vs "created_by" consistency in sub-queries

-- Example fix for patient_extended_info policy
DROP POLICY IF EXISTS "Doctors can manage patient extended info" ON public.patient_extended_info;
CREATE POLICY "Doctors can manage patient extended info"
  ON public.patient_extended_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = patient_extended_info.patient_id
        AND (patients.created_by = auth.uid() OR EXISTS (
          SELECT 1 FROM public.appointments a 
          WHERE a.patient_id = patients.id AND a.doctor_id = auth.uid()
        ))
    )
  );

-- Fix for recordings policies
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can manage their recordings" ON public.recordings;
CREATE POLICY "Doctors can manage their recordings"
  ON public.recordings
  FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = recordings.patient_id
        AND patients.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = recordings.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );

-- Fix for test_results
DROP POLICY IF EXISTS "Doctors can manage test results" ON public.test_results;
CREATE POLICY "Doctors can manage test results"
  ON public.test_results FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = test_results.appointment_id
        AND appointments.doctor_id = auth.uid()
    )
  );

-- MediScribe AI Supabase Schema
-- Includes tables, RLS policies, and basic functions for the MVP

-- Ensure the pgvector extension is enabled
create extension if not exists vector;

-----------------------------------------
-- 1. PROFILES
-----------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  role text not null check (role in ('doctor', 'nurse', 'admin')) default 'doctor',
  first_name text,
  last_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to automatically create a profile on user signup
create or function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'doctor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-----------------------------------------
-- 2. PATIENTS
-----------------------------------------
create table public.patients (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references public.profiles(id) not null,
  first_name text not null,
  last_name text not null,
  dob date not null,
  gender text check (gender in ('male', 'female', 'other')),
  egn_hash text, -- Hashed EGN, never store raw EGN
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.patients enable row level security;

create policy "Doctors can view their own patients" on public.patients
  for select using (auth.uid() = created_by);

create policy "Doctors can insert their own patients" on public.patients
  for insert with check (auth.uid() = created_by);

create policy "Doctors can update their own patients" on public.patients
  for update using (auth.uid() = created_by);

create policy "Doctors can delete their own patients" on public.patients
  for delete using (auth.uid() = created_by);


-----------------------------------------
-- 3. PATIENT ALLERGIES
-----------------------------------------
create table public.patient_allergies (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) on delete cascade not null,
  substance text not null,
  atc_code text,
  severity text check (severity in ('mild', 'moderate', 'severe', 'unknown')) default 'unknown',
  certainty text check (certainty in ('suspected', 'confirmed')) default 'suspected',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.patient_allergies enable row level security;

create policy "Doctors can manage their patients' allergies" on public.patient_allergies
  for all using (
    exists (
      select 1 from public.patients
      where patients.id = patient_allergies.patient_id
      and patients.created_by = auth.uid()
    )
  );


-----------------------------------------
-- 4. PATIENT CONDITIONS
-----------------------------------------
create table public.patient_conditions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) on delete cascade not null,
  condition_name text not null,
  icd10_code text,
  status text check (status in ('active', 'resolved', 'historical')) default 'active',
  diagnosed_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.patient_conditions enable row level security;

create policy "Doctors can manage their patients' conditions" on public.patient_conditions
  for all using (
    exists (
      select 1 from public.patients
      where patients.id = patient_conditions.patient_id
      and patients.created_by = auth.uid()
    )
  );


-----------------------------------------
-- 5. PATIENT MEDICATIONS
-----------------------------------------
create table public.patient_medications (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) on delete cascade not null,
  drug_name text not null,
  atc_code text,
  dosage text,
  frequency text,
  status text check (status in ('active', 'discontinued')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.patient_medications enable row level security;

create policy "Doctors can manage their patients' medications" on public.patient_medications
  for all using (
    exists (
      select 1 from public.patients
      where patients.id = patient_medications.patient_id
      and patients.created_by = auth.uid()
    )
  );


-----------------------------------------
-- 6. APPOINTMENTS
-----------------------------------------
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) on delete cascade not null,
  doctor_id uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'transcribed', 'entities_extracted', 'completed', 'cancelled')) default 'pending',
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone default timezone('utc'::text, now()),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.appointments enable row level security;

create policy "Doctors can manage their appointments" on public.appointments
  for all using (auth.uid() = doctor_id);


-----------------------------------------
-- 7. TRANSCRIPTS
-----------------------------------------
create table public.transcripts (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  raw_text text not null,
  language text default 'bg',
  audio_url text, -- If storing audio in Supabase Storage
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transcripts enable row level security;

create policy "Doctors can view their appointment transcripts" on public.transcripts
  for all using (
    exists (
      select 1 from public.appointments
      where appointments.id = transcripts.appointment_id
      and appointments.doctor_id = auth.uid()
    )
  );


-----------------------------------------
-- 8. EXTRACTED ENTITIES
-----------------------------------------
create table public.extracted_entities (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  entity_type text check (entity_type in ('symptom', 'allergy', 'medication', 'condition', 'diagnosis', 'drug_suggestion')),
  value text not null,
  attributes jsonb default '{}'::jsonb, -- e.g., duration, severity
  negated boolean default false,
  confirmed boolean default false, -- Requires doctor approval
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.extracted_entities enable row level security;

create policy "Doctors can manage their appointment entities" on public.extracted_entities
  for all using (
    exists (
      select 1 from public.appointments
      where appointments.id = extracted_entities.appointment_id
      and appointments.doctor_id = auth.uid()
    )
  );


-----------------------------------------
-- 9. DRUG CATALOGUE
-----------------------------------------
create table public.drug_catalogue (
  id uuid default gen_random_uuid() primary key,
  product_name text not null,
  active_substance text,
  atc_code text,
  source text check (source in ('bda', 'ema', 'custom')),
  authorised_bg boolean default false,
  authorised_eu boolean default false,
  prescription_status text,
  dosage_form text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for searching by ATC code
create index on public.drug_catalogue(atc_code);

alter table public.drug_catalogue enable row level security;

create policy "Anyone authenticated can view drug catalogue" on public.drug_catalogue
  for select using (auth.role() = 'authenticated');


-----------------------------------------
-- 10. ALLERGY SAFETY CHECKS
-----------------------------------------
create table public.allergy_safety_checks (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  drug_atc_code text not null,
  flag text check (flag in ('safe', 'warning', 'contraindicated')),
  details text,
  checked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.allergy_safety_checks enable row level security;

create policy "Doctors can view their appointment safety checks" on public.allergy_safety_checks
  for all using (
    exists (
      select 1 from public.appointments
      where appointments.id = allergy_safety_checks.appointment_id
      and appointments.doctor_id = auth.uid()
    )
  );


-----------------------------------------
-- 11. RECOMMENDATIONS
-----------------------------------------
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  rank integer,
  drug_name text not null,
  atc_code text,
  dosage text,
  frequency text,
  route text,
  rationale text,
  confidence text,
  status text check (status in ('pending_approval', 'approved', 'rejected')) default 'pending_approval',
  approved_by uuid references public.profiles(id),
  rejection_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.recommendations enable row level security;

create policy "Doctors can manage their appointment recommendations" on public.recommendations
  for all using (
    exists (
      select 1 from public.appointments
      where appointments.id = recommendations.appointment_id
      and appointments.doctor_id = auth.uid()
    )
  );


-----------------------------------------
-- 12. APPOINTMENT DOCUMENTS
-----------------------------------------
create table public.appointment_documents (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  doc_type text check (doc_type in ('soap_note', 'prescription', 'referral', 'sick_note')),
  content text, -- Draft content or structured JSON
  storage_path text, -- Path to generated PDF in Supabase Storage
  status text check (status in ('draft', 'finalised')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.appointment_documents enable row level security;

create policy "Doctors can manage their appointment documents" on public.appointment_documents
  for all using (
    exists (
      select 1 from public.appointments
      where appointments.id = appointment_documents.appointment_id
      and appointments.doctor_id = auth.uid()
    )
  );


-----------------------------------------
-- 13. AUDIT LOG
-----------------------------------------
create table public.audit_log (
  id bigserial primary key, -- Sequential ID for regulatory ordering
  user_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.audit_log enable row level security;

create policy "Doctors can view their own audit logs" on public.audit_log
  for select using (auth.uid() = user_id);

-- Normally inserts to audit_log should be done via a secure server function/service role
-- so we don't allow arbitrary client inserts.
create policy "No direct inserts by clients" on public.audit_log
  for insert with check (false);


-----------------------------------------
-- 14-20. PUBMED EVIDENCE & SEARCH (pgvector)
-----------------------------------------
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  pubmed_id text unique not null,
  title text not null,
  abstract text,
  publication_date date,
  journal text,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HNSW index for fast semantic search
create index on public.articles using hnsw (embedding vector_cosine_ops);

alter table public.articles enable row level security;
create policy "Anyone authenticated can view articles" on public.articles for select using (auth.role() = 'authenticated');


create table public.authors (
  id uuid default gen_random_uuid() primary key,
  name text not null
);

create table public.article_authors (
  article_id uuid references public.articles(id) on delete cascade not null,
  author_id uuid references public.authors(id) on delete cascade not null,
  primary key (article_id, author_id)
);


create table public.keywords (
  id uuid default gen_random_uuid() primary key,
  keyword text unique not null
);

create table public.article_keywords (
  article_id uuid references public.articles(id) on delete cascade not null,
  keyword_id uuid references public.keywords(id) on delete cascade not null,
  primary key (article_id, keyword_id)
);


create table public.search_cache (
  id uuid default gen_random_uuid() primary key,
  query_hash text unique not null,
  query_text text not null,
  results jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);


create table public.recommendation_evidence (
  id uuid default gen_random_uuid() primary key,
  recommendation_id uuid references public.recommendations(id) on delete cascade not null,
  article_id uuid references public.articles(id) on delete cascade not null,
  similarity_score float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.recommendation_evidence enable row level security;

create policy "Doctors can view evidence for their recommendations" on public.recommendation_evidence
  for all using (
    exists (
      select 1 from public.recommendations
      join public.appointments on appointments.id = recommendations.appointment_id
      where recommendations.id = recommendation_evidence.recommendation_id
      and appointments.doctor_id = auth.uid()
    )
  );

-----------------------------------------
-- FUNCTIONS
-----------------------------------------

-- Semantic Search Function for matching articles
create or replace function match_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  pubmed_id text,
  title text,
  abstract text,
  similarity float
)
language sql stable
as $$
  select
    articles.id,
    articles.pubmed_id,
    articles.title,
    articles.abstract,
    1 - (articles.embedding <=> query_embedding) as similarity
  from public.articles
  where 1 - (articles.embedding <=> query_embedding) > match_threshold
  order by articles.embedding <=> query_embedding
  limit match_count;
$$;

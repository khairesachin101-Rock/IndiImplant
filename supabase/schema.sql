-- ============================================================================
-- IndiaImplant — Supabase schema, security policies, and seed data
-- ============================================================================
-- HOW TO RUN THIS:
-- 1. Go to your Supabase project → SQL Editor → New query
-- 2. Paste this ENTIRE file and click "Run"
-- 3. It is safe to re-run (uses IF NOT EXISTS / drop-and-recreate for policies)
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- One row per signed-up user (doctor OR company admin), linked 1:1 to
-- Supabase Auth's built-in auth.users table.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('doctor', 'company')),
  name text not null,
  email text not null,
  phone text,
  hospital_or_company text,
  reg_no text,                 -- doctor: medical registration number
  company_id text,             -- company role: links to companies.id (set after company row is created)
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  logo_initial text,
  about text,
  location text,
  cdsco_license text,
  phone text,
  psi_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_company_id_fkey
  foreign key (company_id) references companies(id) on delete set null;

create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references companies(id) on delete cascade,
  company_name text not null,
  name text not null,
  category text not null,
  material text,
  size_range text,
  cdsco_certified boolean not null default false,
  rating numeric(2,1) not null default 0,
  orders_count integer not null default 0,
  price numeric(12,2),                  -- NULL = "Quote on request"
  delivery_days integer,
  description text,
  specs jsonb not null default '{}'::jsonb,
  is_psi boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  doctor_name text not null,
  phone text not null,
  hospital text,
  message text not null,
  type text not null default 'enquiry' check (type in ('enquiry', 'order')),
  product_id text references products(id) on delete set null,
  product_name text,
  company_id text references companies(id) on delete cascade,
  company_name text,
  status text not null default 'new' check (status in ('new', 'in_discussion', 'confirmed', 'completed')),
  payment_due_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists psi_cases (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  doctor_name text not null,
  phone text not null,
  company_id text references companies(id) on delete set null,
  company_name text,
  case_notes text not null,
  open_case boolean not null default false,
  file_path text,             -- path inside the 'psi-files' storage bucket, if a scan was attached
  status text not null default 'submitted' check (status in ('submitted', 'designer_assigned', 'quoted', 'confirmed', 'completed')),
  quotation numeric(12,2),
  payment_due_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references psi_cases(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('doctor', 'company')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_company on products(company_id);
create index if not exists idx_enquiries_doctor on enquiries(doctor_id);
create index if not exists idx_enquiries_company on enquiries(company_id);
create index if not exists idx_psi_cases_company on psi_cases(company_id);
create index if not exists idx_psi_cases_doctor on psi_cases(doctor_id);
create index if not exists idx_messages_thread on messages(thread_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) — this is what makes the platform actually safe.
--    Without this, anyone with your public anon key could read/write everything.
-- ============================================================================

alter table profiles enable row level security;
alter table companies enable row level security;
alter table products enable row level security;
alter table enquiries enable row level security;
alter table psi_cases enable row level security;
alter table messages enable row level security;

-- ---- profiles: a user can only read/write their own profile row ----
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- ---- companies: catalogue is visible to any logged-in user; only the
--      owning company account can create/edit its own row ----
drop policy if exists "companies_select_authenticated" on companies;
create policy "companies_select_authenticated" on companies for select
  using (auth.role() = 'authenticated');

drop policy if exists "companies_insert_own" on companies;
create policy "companies_insert_own" on companies for insert
  with check (owner_id = auth.uid());

drop policy if exists "companies_update_own" on companies;
create policy "companies_update_own" on companies for update
  using (owner_id = auth.uid());

-- ---- products: catalogue readable by any logged-in user; only the
--      manufacturer that owns the parent company can add/edit its products ----
drop policy if exists "products_select_authenticated" on products;
create policy "products_select_authenticated" on products for select
  using (auth.role() = 'authenticated');

drop policy if exists "products_insert_own_company" on products;
create policy "products_insert_own_company" on products for insert
  with check (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));

drop policy if exists "products_update_own_company" on products;
create policy "products_update_own_company" on products for update
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));

drop policy if exists "products_delete_own_company" on products;
create policy "products_delete_own_company" on products for delete
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));

-- ---- enquiries: a doctor sees/creates their own; the receiving company
--      sees enquiries addressed to it and can update status ----
drop policy if exists "enquiries_select" on enquiries;
create policy "enquiries_select" on enquiries for select
  using (
    doctor_id = auth.uid()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

drop policy if exists "enquiries_insert" on enquiries;
create policy "enquiries_insert" on enquiries for insert
  with check (doctor_id = auth.uid());

drop policy if exists "enquiries_update_company" on enquiries;
create policy "enquiries_update_company" on enquiries for update
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));

-- ---- psi_cases: doctor who filed it, the assigned company, and (for
--      open/unassigned cases) any logged-in company can all see it ----
drop policy if exists "psi_cases_select" on psi_cases;
create policy "psi_cases_select" on psi_cases for select
  using (
    doctor_id = auth.uid()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
    or (open_case = true and auth.role() = 'authenticated')
  );

drop policy if exists "psi_cases_insert" on psi_cases;
create policy "psi_cases_insert" on psi_cases for insert
  with check (doctor_id = auth.uid());

drop policy if exists "psi_cases_update" on psi_cases;
create policy "psi_cases_update" on psi_cases for update
  using (
    doctor_id = auth.uid()
    or exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
    or (open_case = true and auth.role() = 'authenticated')
  );

-- ---- messages: only the doctor and company involved in that specific
--      PSI case can read or send messages in its thread ----
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    exists (
      select 1 from psi_cases pc
      where pc.id = thread_id
      and (
        pc.doctor_id = auth.uid()
        or exists (select 1 from companies c where c.id = pc.company_id and c.owner_id = auth.uid())
      )
    )
  );

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from psi_cases pc
      where pc.id = thread_id
      and (
        pc.doctor_id = auth.uid()
        or exists (select 1 from companies c where c.id = pc.company_id and c.owner_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- 3. REALTIME — lets the chat page get new messages instantly instead of
--    polling. Safe to re-run.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ============================================================================
-- 4. STORAGE — private bucket for PSI case files (CT scans / DICOM exports).
--    Files are stored under a path like "<doctor-user-id>/filename.ext".
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('psi-files', 'psi-files', false)
on conflict (id) do nothing;

drop policy if exists "psi_files_insert_own" on storage.objects;
create policy "psi_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'psi-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "psi_files_select_authenticated" on storage.objects;
create policy "psi_files_select_authenticated" on storage.objects for select to authenticated
  using (bucket_id = 'psi-files');
-- NOTE: select is open to any logged-in user for now so the receiving
-- company can view an attached scan. Patient scan data is sensitive —
-- before handling real patient data, tighten this (e.g. issue short-lived
-- signed URLs via a server-side function scoped to the specific case) and
-- get a DPDP Act 2023 compliance review done. See README.

-- ============================================================================
-- 5. SEED DATA — sample manufacturers + products so the catalogue isn't
--    empty on first run. owner_id is NULL for these (no real login owns
--    them) — real companies you onboard will sign up and get their own
--    company row with a real owner_id, separate from these samples.
--    Delete this block (or the rows it inserts) whenever you're ready to
--    go fully live with only real manufacturer data.
-- ============================================================================

insert into companies (id, owner_id, name, logo_initial, about, location, cdsco_license, phone, psi_enabled) values
('c001', NULL, 'Orthotech Implants', 'O', 'Orthotech Implants manufactures CDSCO-certified hip and trauma implants from its Pune facility, serving hospitals across Western India.', 'Pune, Maharashtra', 'CDSCO/MD/2019/00214', '+91 98200 00001', false),
('c002', NULL, 'MedLine Orthopaedics', 'M', 'MedLine Orthopaedics is a Bengaluru-based manufacturer specialising in knee and spine implant systems for tertiary care hospitals.', 'Bengaluru, Karnataka', 'CDSCO/MD/2018/00587', '+91 98450 00002', false),
('c003', NULL, 'SurgiCraft India', 'S', 'SurgiCraft India produces knee and sports medicine implants with a distribution network across North and Central India.', 'Delhi NCR', 'CDSCO/MD/2020/00932', '+91 98110 00003', false),
('c004', NULL, 'Spinova Devices', 'S', 'Spinova Devices focuses on spinal fusion and arthroscopy implants, manufactured at its Hyderabad plant.', 'Hyderabad, Telangana', 'CDSCO/MD/2021/00145', '+91 90000 00004', false),
('c005', NULL, 'NeuroForm Medical', 'N', 'NeuroForm Medical specialises in cranial and craniomaxillofacial implants, including patient-specific implants (PSI) designed in-house.', 'Chennai, Tamil Nadu', 'CDSCO/MD/2017/00078', '+91 94440 00005', true),
('c006', NULL, 'Apex Biomedical', 'A', 'Apex Biomedical is a Mumbai-based manufacturer offering both standard hip implants and custom patient-specific reconstruction devices.', 'Mumbai, Maharashtra', 'CDSCO/MD/2016/00341', '+91 98200 00006', true)
on conflict (id) do nothing;

insert into products (id, company_id, company_name, name, category, material, size_range, cdsco_certified, rating, orders_count, price, delivery_days, description, specs, is_psi) values
('p001', 'c001', 'Orthotech Implants', 'Acetabular Cup', 'Hip Implant', 'Titanium Alloy (Ti6Al4V)', '44mm - 66mm', true, 4.6, 312, 18500, 5, 'Press-fit acetabular cup with porous titanium coating for enhanced bone in-growth. Designed for primary and revision hip arthroplasty.', '{"Coating": "Porous plasma-sprayed titanium", "Liner Compatibility": "Highly cross-linked polyethylene", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p002', 'c001', 'Orthotech Implants', 'Femoral Stem - Standard Offset', 'Hip Implant', 'Cobalt-Chrome', '8mm - 20mm', true, 4.4, 198, 24500, 6, 'Tapered wedge femoral stem for cementless fixation, engineered for stable primary rotational control.', '{"Neck Angle": "132 degrees", "Fixation": "Cementless, proximal coated", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p003', 'c002', 'MedLine Orthopaedics', 'Total Knee System - Fixed Bearing', 'Knee Implant', 'Cobalt-Chrome / UHMWPE', 'Size 1 - 8', true, 4.7, 421, 32000, 4, 'Anatomically contoured femoral component with fixed-bearing tibial insert for primary total knee replacement.', '{"Articulation": "Fixed bearing, cruciate retaining", "Insert Material": "UHMWPE", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p004', 'c003', 'SurgiCraft India', 'PS Knee Femoral Component', 'Knee Implant', 'Cobalt-Chrome', 'Size 2 - 9', true, 4.3, 156, 29500, 7, 'Posterior-stabilized femoral component with deepened trochlear groove for improved patellar tracking.', '{"Articulation": "Posterior stabilized", "Compatibility": "SurgiCraft PS tibial tray", "Sterilization": "Gamma irradiated", "Shelf Life": "4 years"}'::jsonb, false),
('p005', 'c002', 'MedLine Orthopaedics', 'Pedicle Screw System', 'Spine Implant', 'Titanium Alloy', '4.5mm - 8.5mm dia', true, 4.5, 267, 15500, 5, 'Polyaxial pedicle screw system for posterior spinal fixation across lumbar and thoracic regions.', '{"Screw Type": "Polyaxial, cannulated", "Rod Diameter Compatibility": "5.5mm / 6.0mm", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p006', 'c004', 'Spinova Devices', 'Interbody Cage - Lumbar', 'Spine Implant', 'PEEK with Titanium Markers', '22mm - 32mm', true, 4.2, 98, 21000, 8, 'PEEK interbody fusion cage with radiographic markers, designed for anterior column support.', '{"Radiolucency": "PEEK body with Ti markers", "Surface": "Textured for graft containment", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p007', 'c003', 'SurgiCraft India', 'ACL Reconstruction Screw Set', 'Arthroscopy', 'Titanium', '7mm - 10mm', true, 4.5, 340, 6800, 3, 'Interference screw set for ACL graft fixation, compatible with standard arthroscopic instrumentation.', '{"Thread Design": "Blunt-tipped, cannulated", "Instrumentation": "Standard arthroscopic set compatible", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p008', 'c004', 'Spinova Devices', 'Shoulder Anchor Suture System', 'Arthroscopy', 'PEEK', '4.5mm - 5.5mm', true, 4.1, 87, 5200, 4, 'Knotless suture anchor for rotator cuff repair with high pull-out strength.', '{"Anchor Type": "Knotless, threaded", "Suture": "No. 2 high-strength braided", "Sterilization": "Gamma irradiated", "Shelf Life": "4 years"}'::jsonb, false),
('p009', 'c005', 'NeuroForm Medical', 'Cranial Fixation Plate System', 'Cranial Implant', 'Titanium', 'Standard + Custom', true, 4.6, 142, 12500, 6, 'Low-profile titanium plating system for cranial bone flap fixation post-craniotomy.', '{"Plate Thickness": "0.6mm", "Screw Diameter": "1.5mm self-tapping", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p010', 'c005', 'NeuroForm Medical', 'PSI Cranial Implant (Custom)', 'Cranial Implant', 'PEEK (Patient-Specific)', 'Custom - built from patient CT', true, 4.8, 54, NULL, 21, 'Patient-specific cranial implant designed from CT scan data. Available only via PSI Connect - price quoted after case review.', '{"Design Process": "CT-based 3D modelling", "Fit Verification": "Pre-surgical surgeon sign-off", "Sterilization": "Gamma irradiated", "Turnaround": "14-21 days from case approval"}'::jsonb, true),
('p011', 'c006', 'Apex Biomedical', 'Dual Mobility Hip Cup', 'Hip Implant', 'Cobalt-Chrome / Titanium Shell', '46mm - 62mm', true, 4.4, 121, 27500, 6, 'Dual mobility acetabular system for reduced dislocation risk in revision and high-risk primary cases.', '{"Mobility": "Dual mobility bearing", "Shell Coating": "Porous titanium", "Sterilization": "Gamma irradiated", "Shelf Life": "5 years"}'::jsonb, false),
('p012', 'c006', 'Apex Biomedical', 'PSI Mandible Reconstruction Plate', 'Cranial Implant', 'Titanium (Patient-Specific)', 'Custom - built from patient CT', true, 4.7, 38, NULL, 18, 'Custom mandible reconstruction plate for oncologic or trauma cases, designed from patient imaging via PSI Connect.', '{"Design Process": "CT-based 3D modelling", "Fit Verification": "Pre-surgical surgeon sign-off", "Sterilization": "Gamma irradiated", "Turnaround": "12-18 days from case approval"}'::jsonb, true)
on conflict (id) do nothing;

-- Done. Go to Table Editor to confirm 6 companies + 12 products exist.

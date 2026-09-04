-- ============================================================================
-- IndiaImplant — Migration 02: product images, catalogue self-serve, and
-- chat working on BOTH PSI cases and regular enquiries/orders.
-- ============================================================================
-- HOW TO RUN: Supabase → SQL Editor → New query → paste this whole file →
-- Run. Safe to re-run.
-- ============================================================================

-- ---------- 1. Product images ----------
alter table products add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_insert_own_company" on storage.objects;
create policy "product_images_insert_own_company" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from companies c where c.id = (storage.foldername(name))[1] and c.owner_id = auth.uid())
  );

drop policy if exists "product_images_select_public" on storage.objects;
create policy "product_images_select_public" on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_delete_own_company" on storage.objects;
create policy "product_images_delete_own_company" on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (select 1 from companies c where c.id = (storage.foldername(name))[1] and c.owner_id = auth.uid())
  );

-- ---------- 2. Chat: allow messages on enquiries too, not just PSI cases ----------
-- Drop the old constraint that only allowed thread_id to point at psi_cases.
alter table messages drop constraint if exists messages_thread_id_fkey;

alter table messages add column if not exists thread_type text not null default 'psi'
  check (thread_type in ('psi', 'enquiry'));

-- Replace the old policies (which only checked psi_cases) with versions that
-- check the right parent table based on thread_type.
drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages for select
  using (
    (
      thread_type = 'psi' and exists (
        select 1 from psi_cases pc
        where pc.id = thread_id
        and (pc.doctor_id = auth.uid() or exists (select 1 from companies c where c.id = pc.company_id and c.owner_id = auth.uid()))
      )
    )
    or
    (
      thread_type = 'enquiry' and exists (
        select 1 from enquiries e
        where e.id = thread_id
        and (e.doctor_id = auth.uid() or exists (select 1 from companies c where c.id = e.company_id and c.owner_id = auth.uid()))
      )
    )
  );

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and (
      (
        thread_type = 'psi' and exists (
          select 1 from psi_cases pc
          where pc.id = thread_id
          and (pc.doctor_id = auth.uid() or exists (select 1 from companies c where c.id = pc.company_id and c.owner_id = auth.uid()))
        )
      )
      or
      (
        thread_type = 'enquiry' and exists (
          select 1 from enquiries e
          where e.id = thread_id
          and (e.doctor_id = auth.uid() or exists (select 1 from companies c where c.id = e.company_id and c.owner_id = auth.uid()))
        )
      )
    )
  );

-- ---------- 3. PSI case status: add "designer_assigned"/"quoted" progression ----------
-- (already supported by the original schema's status check constraint — no change needed)

-- Done.

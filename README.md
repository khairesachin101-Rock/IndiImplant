# IndiImplant

**Web-based implant discovery & PSI workflow platform** — connecting doctors, hospitals, and medical-device manufacturers on a single platform.

Orthopedic and implant surgeons in India currently discover products and coordinate custom implant cases through unorganized channels — WhatsApp, phone calls, and email. IndiImplant replaces that with a structured web platform: a searchable implant catalogue for standard products, and a dedicated workflow (**PSI Connect**) for Patient-Specific Implant cases that need close surgeon–manufacturer coordination.

---

## What it does

- **Implant Catalogue** — Manufacturers list CDSCO-certified implant products (Hip, Knee, Spine, Arthroscopy, Cranial) with material, size range, and certification details. Doctors search, filter (by rating, orders, price, certification), and either send an enquiry or place an order directly to the manufacturer.
- **PSI Connect** — For Patient-Specific Implant cases, doctors submit case details either to a specific manufacturer or as an open case for multiple manufacturers to respond to. Each case has its own chat thread for case discussion, design clarification, and quotation sharing, with status tracked from submission through to confirmation.
- **Role-based access** — Separate experiences for doctors, manufacturers, and distributors, each with their own dashboard.
- **Manufacturer dashboard** — Manufacturers manage their product listings, view incoming enquiries and PSI cases, and respond to doctors directly.

## Tech stack

- **Frontend:** React (Vite), React Router
- **Backend / Database:** Supabase — Postgres database, Auth (email/password), Row Level Security policies, Realtime subscriptions (chat), Storage (case file attachments)
- **Styling:** Custom CSS design system (no UI framework)

## Why Supabase

The project uses Supabase instead of a self-managed backend so that authentication, the database, file storage, and real-time chat updates are all covered by one service with Postgres underneath — appropriate for a small team building and iterating quickly. Access control (who can see which enquiries, PSI cases, and messages) is enforced with Postgres Row Level Security policies rather than in application code.

## Data model

| Table | Purpose |
|---|---|
| `profiles` | One row per signed-up user — role (doctor / company / distributor), name, phone, and role-specific fields (medical registration number, CDSCO license) |
| `companies` | A manufacturer's public profile — created on signup for company-role users |
| `products` | Catalogue listings, owned by a company |
| `enquiries` | Catalogue-driven leads — "Order Now" or "Enquiry" submissions from doctors |
| `psi_cases` | PSI Connect case submissions — direct-to-company or open |
| `messages` | Chat messages scoped to a PSI case thread |

Full schema and RLS policies: [`supabase/schema.sql`](./supabase/schema.sql).

## Status

This is a working prototype, not a production deployment. Functional end to end — real auth, real database reads/writes, real-time chat — but the following are intentionally not yet built:

- Payment gateway integration (the payment cycle is represented in the UI; no money moves through the platform yet)
- Production-grade file encryption / DPDP Act–compliant handling for patient-identifiable case files
- Admin/moderation tooling for verifying doctor and manufacturer signups

## Running locally

```bash
cd frontend
npm install
cp .env.example .env   # add your Supabase project URL + anon key
npm run dev
```

Database setup: run `supabase/schema.sql` then (optionally) `supabase/seed.sql` in the Supabase SQL Editor to seed a starter catalogue.

## Project type

Group project, built and iterated on collaboratively (Dec 2025 – present).

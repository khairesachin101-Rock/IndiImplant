# IndiaImplant — Real, Supabase-backed platform

This is a **real, working full-stack app** — React frontend + Supabase
(Postgres database + real authentication + file storage + real-time chat).
There is no mock backend anymore. Every signup, login, product listing,
enquiry, PSI case, and chat message is a real row in a real database,
protected by Row Level Security (RLS) so people can only see/edit what
they're supposed to.

```
indiaimplant/
├── supabase/
│   └── schema.sql       ← run this once in your Supabase project
└── frontend/             React + Vite app
    ├── .env.example      ← copy to .env and fill in your Supabase keys
    └── src/
        ├── supabaseClient.js   Supabase connection
        ├── api.js              all database calls
        ├── session.js          auth session handling
        ├── pages/               Login, DoctorDashboard, CategoryListing,
        │                        ProductDetail, PSIConnect, PSICaseChat,
        │                        CompanyDashboard, CompanyProfile
        └── components/          Navbar, OfferSlider, ProductCard, EnquiryModal
```

---

## 1. Create your Supabase project (5 minutes, free)

1. Go to **[supabase.com](https://supabase.com)** → sign up → **New project**.
2. Pick any name/region, set a database password (save it somewhere), wait
   ~2 minutes for it to spin up.
3. In the left sidebar go to **SQL Editor** → **New query**.
4. Open `supabase/schema.sql` from this project, copy the **entire file**,
   paste it into the SQL editor, and click **Run**.
   - This creates every table (profiles, companies, products, enquiries,
     psi_cases, messages), turns on Row Level Security with the correct
     policies, enables real-time on the chat table, creates a private
     storage bucket for PSI scan files, and seeds 6 sample manufacturers
     + 12 sample products so the catalogue isn't empty.
5. Go to **Project Settings → API**. You'll need two values from here in
   step 2 below: the **Project URL** and the **anon public** key.

**Email confirmation:** by default Supabase requires users to click a
confirmation link before their first login works. For fast local testing,
go to **Authentication → Providers → Email** and turn **"Confirm email"**
off. Turn it back on before you let real doctors/manufacturers sign up.

---

## 2. Run it locally

You need [Node.js](https://nodejs.org) v18+ installed.

```bash
cd frontend
copy .env.example .env        (Windows Command Prompt)
```
Open `frontend/.env` and paste in your **Project URL** and **anon public**
key from step 1.5.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. That's it — no second terminal, no backend
server to keep running. Every read/write goes straight to your Supabase
project.

> Windows note: always run these commands from **Command Prompt**, not
> PowerShell, since PowerShell's execution policy blocks npm scripts on
> your machine by default.

---

## 3. How to use it for real

- **Sign up as a Manufacturer** first (role tab → Manufacturer → Sign up),
  using a real email + password. This creates a real `companies` row owned
  by that account — you'll land on `/dashboard`.
- **Sign up as a Doctor / Surgeon** in a separate browser (or incognito
  window, or just log out and back in) to browse the catalogue, send
  enquiries, and submit PSI cases.
- Enquiries and orders placed by the doctor show up live in the
  manufacturer's dashboard (query it with a second account to see this).
- PSI Connect cases open a real chat thread (`psi_cases` + `messages`
  tables) with live real-time delivery — no polling, no page refresh needed.
- File uploads in PSI Connect go to a private Supabase Storage bucket
  (`psi-files`), not just a UI placeholder.

The 6 sample manufacturers and 12 sample products from `schema.sql` are
seed data with no real login attached (`owner_id` is NULL) — they exist so
the catalogue has content on day one. Real manufacturers you onboard get
their own row with a real `owner_id` the moment they sign up. Delete the
seed rows from the Supabase Table Editor whenever you're ready to launch
with only real listings.

---

## 4. What's genuinely real now vs. what's still a business/legal step, not a coding one

| Area | Status |
|---|---|
| **Auth** | Real — Supabase Auth, hashed passwords, JWT sessions, RLS enforced on every table |
| **Database** | Real — Postgres on Supabase, persists forever, automatic backups on paid tiers |
| **Chat** | Real — Supabase Realtime, messages appear instantly, persisted in the `messages` table |
| **PSI file upload** | Real — stored in a private Storage bucket, scoped per logged-in user |
| **Payments** | Still UI-only — "Confirm case" just updates a status + due-date column. No money moves. Wiring a real payment gateway (Razorpay/PayU) with escrow-style holding is the next real build step once you've validated the flow with a few manufacturers |
| **Doctor / CDSCO verification** | Signup doesn't yet verify a doctor's medical registration number or a company's CDSCO license against any registry — anyone can create an account with any details typed in. Add a manual admin-approval step or a verification API before trusting listings/orders at scale |
| **CDSCO advertising compliance** | Product descriptions/specs are stored as free text — you're responsible for what manufacturers list; keep language factual/technical, no comparative or exaggerated claims |
| **Patient data (PSI scans)** | Storage is private and login-gated, but before real patient CT scans flow through this, get a lawyer to review handling against India's DPDP Act 2023, and consider anonymization + short-lived signed URLs instead of the current "any logged-in user can view" storage policy |

None of the items above need a bigger rebuild — they're policy/compliance
decisions and incremental features on top of what's already running.

---

## 5. Deploying it live

The frontend is a static Vite build — deploy it to **Vercel** or
**Netlify** for free:

1. Push this project to a GitHub repo (you already have
   `khairesachin101-rock` on GitHub).
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo
   → set **Root Directory** to `frontend`.
3. Add the same two environment variables from your `.env` file
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel's project
   settings → **Environment Variables**.
4. Deploy. You'll get a live `https://your-project.vercel.app` URL you can
   share with the doctors and manufacturers who already confirmed interest.

Your Supabase project is already "live" the moment you ran `schema.sql` —
there's no separate backend to deploy or a server to keep running.

---

## 6. Suggested next steps, in order

1. Turn email confirmation back on before real users sign up.
2. Get 2–3 real manufacturers to create their own company accounts and
   list real products (replacing/supplementing the seed data).
3. Get 5–10 doctors testing the catalogue + enquiry flow and collect
   feedback.
4. Add a simple admin check (even a manual one — you approving each new
   company account in the Supabase Table Editor before `psi_enabled` or
   visibility is turned on) so you're not trusting unverified accounts yet.
5. Once the core flow is validated, prioritise the payment gateway
   integration — don't build it before then.

---

## 7. Design notes

Palette and type system are defined in `frontend/src/index.css` as CSS
variables (`--ink`, `--paper`, `--accent`, `--accent-warm`, etc.) — change
values there to re-theme the whole app in one place. Display font is
Fraunces, body/UI font is IBM Plex Sans, data/spec values use IBM Plex Mono.

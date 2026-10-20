# GIRSI

Equipment loan management for **GIRSI**, a student research group (*semillero de investigación*). Lab administrators use it to track which equipment is lent to which student. Students use it to check their own loans and the research projects they belong to.

The UI is in Spanish. This README is in English.

## Features

### Administrators

- **Loans.** Pick a registered student from a list (name, code and email come from their account), with two mandatory delivery photos (top and bottom view), a start date and an optional expected return date. When the equipment comes back, mark the loan as returned.
- **Inventory.** Lab equipment of any type: Raspberry Pi, sensors, Arduinos and so on.
  - Each item has a category, a model and an optional description and serial number.
  - New units can be added in batches. Codes are generated automatically (`ARD-001`, `ARD-002`, …).
  - Items that have never been loaned can be deleted.
- **Projects.** Create research projects, assign registered students to them and mark them as active or finished.
- **Dashboard, students and history.** Live availability per category, students with active loans, and the history of returned loans.

### Students

- Sign up at `/registro`, then confirm the account with a one-time **code** sent by email (`/verificar`). A code is used instead of a link because the university's Outlook security scanner opens links automatically and uses them up. See [Email delivery](#email-delivery) for why the app sends this email itself.
- `/mi-panel` shows:
  - the equipment they currently hold, with due dates and overdue status;
  - their past loans;
  - their projects and teammates.

### Automatic emails

| When | Sent to |
| --- | --- |
| Loan created | Student, with the professor in CC |
| Loan returned | Student, with the professor in CC |
| One day before the expected return date (reminder) | Student |
| Return date passed (overdue notice) | Student |

The reminder and the overdue notice are each sent at most once per loan. All emails, including the verification code, go out through the app's own SMTP account (see [Email delivery](#email-delivery)).

### Data handling

When a loan is marked as returned, its delivery photos are deleted from storage.

## Tech stack

- [Astro 7](https://astro.build) with server-side rendering (`output: 'server'`), deployed on **Vercel** with `@astrojs/vercel`.
- [Supabase](https://supabase.com):
  - Postgres with Row Level Security;
  - Auth (email and password);
  - Storage (private bucket for delivery photos).
- [Tailwind CSS 4](https://tailwindcss.com).
- [Nodemailer](https://nodemailer.com) over SMTP (a Gmail account) for every email the app sends.
- `sharp` for server-side photo compression and `heic-to` for converting iPhone HEIC photos in the browser.

## Roles and security

Every user has a row in `profiles` with a role of either `admin` or `estudiante` (student).

- **New sign-ups are always students.** The role is never read from user-supplied sign-up data.
- **Access is enforced twice.**
  - The Astro middleware (`src/middleware.ts`) keeps students out of admin screens.
  - Postgres RLS policies protect the data itself, even against direct API calls.
- **Students only see what concerns them:**
  - loans whose `student_email` matches the verified email on their account;
  - projects they are a member of.
- **Delivery photos are admin-only.**

To promote a user to administrator, run this in the Supabase SQL editor:

```sql
update profiles set role = 'admin' where email = 'someone@example.com';
```

## Project structure

```text
├── public/                  Static assets (logo, favicon, Open Graph image)
├── src/
│   ├── layouts/             Base HTML layout (SEO tags) and the app shell with navigation
│   ├── lib/                 Auth/roles, dates (America/Bogota), emails, inventory, SEO, Supabase clients
│   ├── middleware.ts        Session, profile loading and role-based route protection
│   └── pages/
│       ├── index.astro      Admin dashboard
│       ├── prestamos/       Loans: list, new loan, loan detail
│       ├── inventario/      Inventory: list, add equipment
│       ├── proyectos/       Projects: list/create, detail with members
│       ├── estudiantes/     Students with active loans
│       ├── historial/       Returned loans
│       ├── mi-panel/        Student dashboard
│       ├── login.astro, registro.astro, verificar.astro
│       ├── api/             Form actions and the daily cron endpoint
│       ├── 404.astro
│       └── robots.txt.ts, sitemap.xml.ts, llms.txt.ts
├── supabase/migrations/     SQL migrations (run in order)
└── vercel.json              Daily cron schedule
```

## Getting started

### Prerequisites

- Node.js **22.12 or newer**
- A Supabase project
- An SMTP account for sending email, for example a Gmail account with an [app password](https://myaccount.google.com/apppasswords). Without SMTP settings, emails are skipped and logged to the console, and new students cannot receive their verification code.

### 1. Install

```sh
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill it in:

| Variable | Where to find it | Purpose |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Public anon key, used with each user's session |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **Server only.** Bypasses RLS. Used by the daily cron and to create accounts and verification codes at sign-up |
| `SMTP_HOST`, `SMTP_PORT` | Your email provider (Gmail: `smtp.gmail.com`, `465`) | SMTP server |
| `SMTP_USER` | The sending address | Also used as the `From` address |
| `SMTP_PASS` | Gmail: an app password (requires 2-Step Verification) | SMTP password |
| `MAIL_FROM_NAME` | Any text, e.g. `GIRSI Préstamos` | Sender display name |
| `CRON_SECRET` | Any long random string | Authenticates Vercel Cron calls |

Never commit `.env`. It is excluded by `.gitignore`.

### 3. Database

Run the files in `supabase/migrations/` **in numeric order** in the Supabase SQL editor.

| Migrations | What they do |
| --- | --- |
| `0001`–`0008` | Initial schema, the original Raspberry Pi inventory, return dates, accessories and overdue tracking |
| `0009` | Generalizes the inventory: `raspberry_pis` becomes `items`, and the `item_status` view is created |
| `0010` | Adds profiles, roles and role-based RLS. **Every user that already exists becomes `admin`** |
| `0011` | Adds projects and project members |
| `0012` | Adds tracking for the return reminder |

If you are upgrading a database that already has `0001`–`0008` applied, run only `0009`–`0012`.

### 4. Supabase Auth settings

- **Authentication → Sign In / Providers → Email:** keep **Confirm email** enabled. Students see their loans by matching their verified email, so confirmation is what stops someone from signing up with another student's address.
- **Authentication → URL Configuration:** set the **Site URL** to your production URL.
- Supabase's email templates and SMTP settings are **not used** by the sign-up flow: the app creates the account and its code with the admin API, which sends nothing, and emails the code itself.

### Email delivery

Supabase Auth's own emails were silently dropped by the university's Microsoft 365 filter, even when sent through the same Gmail account that delivered manual emails fine. Comparing the raw messages showed why: Supabase sends HTML-only messages with Amazon SES and Postmark tracking headers (`X-SES-Message-Tags`, `X-PM-Metadata-*`), even though they never go through those services.

So the app sends every email itself (`src/lib/mailer.ts`, `src/lib/verification.ts`):
- normal `multipart/alternative` messages (plain text plus HTML) over SMTP;
- verification codes are created with `auth.admin.generateLink({ type: 'signup' })`, which returns the code without sending anything;
- a new code invalidates the previous one, and the same address can request a new code at most once a minute.

### 5. Run locally

```sh
npm run dev
```

The app runs at `http://localhost:4321`. Create the first administrator in one of two ways:

- sign up at `/registro`, then promote that account with the SQL query shown above; or
- create the user in Supabase Auth **before** running migration `0010`, so the migration makes it an admin.

## Deployment (Vercel)

1. Import the repository in Vercel. The framework (Astro) is detected automatically.
2. Add the environment variables from step 2 in **Project Settings → Environment Variables**.
3. Deploy.

The daily check in `vercel.json` calls `/api/cron/check-overdue` at **13:00 UTC, which is 08:00 in Bogotá**. In each run it:

- sends return reminders for loans due tomorrow, or due today if the loan was created after the previous run;
- sends overdue notices for loans past their return date.

Vercel signs the request with `CRON_SECRET`.

To make canonical URLs, the sitemap and Open Graph tags always use the production domain, set `site` in `astro.config.mjs`:

```js
export default defineConfig({
  site: 'https://your-domain.com',
  // ...
});
```

If `site` is not set, those URLs are built from the host of each request.

## SEO and crawling

- Every page is server-rendered. Each one has:
  - a unique `<title>`, a meta description and a canonical URL;
  - Open Graph and Twitter tags;
  - Schema.org JSON-LD (`Organization`, `WebSite`, `WebPage`);
  - exactly one `<h1>`.
- Only `/login` and `/registro` are indexable. Every page behind the login is marked `noindex`.
- `/robots.txt`, `/sitemap.xml` and `/llms.txt` are generated dynamically. `/llm.txt` serves the same content as `/llms.txt`.
- Unknown URLs get a custom 404 page with a real `404` status.
- Source maps are disabled in production builds.

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run astro -- <command>` | Run Astro CLI commands |

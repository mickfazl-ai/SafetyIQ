# Take 5 Safety App — Full Deployment Guide
## Stack: React + Supabase Auth + Vercel (free)

---

## Step 1 — Supabase setup

1. Go to **app.supabase.com** → your project → **SQL Editor**
2. Run `supabase_migration_v2.sql` — creates tables, RLS, views, triggers
3. Go to **Authentication → Settings**:
   - Set Site URL: `https://take5safety.vercel.app` (your Vercel URL)
   - Add to Redirect URLs: `https://take5safety.vercel.app`
4. Go to **Settings → API**, copy:
   - Project URL  → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`

---

## Step 2 — Add your company codes

In Supabase SQL Editor:
```sql
INSERT INTO companies (name, code) VALUES ('AFJV',         'AFJV-2025');
INSERT INTO companies (name, code) VALUES ('Herrenknecht', 'HK-2025');
-- Add more as needed
```

Workers enter these codes when registering.
Keep codes private — share only with site supervisors.

---

## Step 3 — Configure the app

Open `App.jsx` and update the two lines at the top:
```js
const SUPABASE_URL      = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...your-anon-key...";
```

---

## Step 4 — Push to GitHub

```bash
cd take5-safety
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/mickfazl-ai/Take5Safety.git
git push -u origin main
```

---

## Step 5 — Deploy to Vercel (free)

1. Go to **vercel.com** → New Project → Import from GitHub
2. Select your `Take5Safety` repo
3. Framework: **Vite**
4. Click **Deploy**
5. Your app is live at `https://take5safety.vercel.app`

No environment variables needed — Supabase keys are in App.jsx
(for production you can move them to Vercel env vars for extra security)

---

## Step 6 — Make yourself admin

After signing up on the live app:
1. Go to Supabase → **Table Editor** → `profiles`
2. Find your row, set `role` = `admin`
3. Log out and back in — you'll see the Admin button

---

## Step 7 — Share with workers

Send workers the URL + their company code:

> "Download / open: https://take5safety.vercel.app
> Register with your email and company code: **AFJV-2025**"

Works on mobile browser — no app install needed.
Add to home screen on iPhone/Android for app-like experience.

---

## User roles

| Role | Can do |
|------|--------|
| `worker` | Complete Take 5, view company records, export PDF |
| `supervisor` | Same as worker (can be extended) |
| `admin` | All of the above + admin dashboard, all companies, add companies, delete records |

---

## Adding company logo

In Supabase → Table Editor → `companies`:
- Upload logo to **Storage** → `company-logos` bucket
- Copy the public URL into the `logo_url` column for that company
- App will display it in the header automatically

---

## File structure
```
take5-safety/
├── App.jsx          ← Full React app (auth + Take 5 + SWMS + admin)
├── index.html       ← Entry point
├── vite.config.js   ← Build config
├── package.json     ← Dependencies
```

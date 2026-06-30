# FitSync — Setup & Demo Guide

A multi-tenant SaaS for gym management, built with the MERN stack (MongoDB, Express, React + Vite, Node.js).

This guide walks through getting the project running on a fresh machine and demonstrating each major feature. Read it top-to-bottom on first setup; after that, the "Demo Walkthrough" and "Troubleshooting" sections are the most useful for review.

---

## Prerequisites

Install these before going further:

| Tool | Version | Verify with |
|---|---|---|
| Node.js | 18 or higher | `node -v` |
| npm | 9 or higher (ships with Node 18+) | `npm -v` |
| MongoDB Community Server | 6.x or higher (running locally) | `mongod --version` |
| Git | any recent version | `git --version` |

Also needed (covered later in this guide):

- A **Gmail account** with 2-Step Verification enabled — used for sending OTP emails. Email verification is mandatory in this build, so this isn't optional.
- **MongoDB Compass** (optional but recommended) — useful for inspecting data and explaining the schema during the viva.

---

## 1. Install dependencies

From the project root, run two `npm install` commands — one for the backend, one for the frontend:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Each `npm install` should finish without errors. If you see deprecation warnings about transitive dependencies that's normal and harmless. Each install takes 1–3 minutes depending on your internet speed.

**What `npm install` does**: it reads `package.json` in the current folder and downloads every package listed there into a local `node_modules/` folder. **You don't need to install anything individually** — no separate `npm install express`, `npm install mongoose`, etc. The single `npm install` command handles everything.

For reference, here's what gets pulled in (you don't need to memorise this — it's just so you know what the project depends on):

**Backend** (16 packages):
- `express` — web server framework
- `mongoose` — MongoDB driver
- `bcryptjs` — password hashing
- `jsonwebtoken` — JWT auth
- `nodemailer` — Gmail SMTP for OTP emails
- `express-validator` — request validation
- `express-rate-limit` — brute-force protection on login
- `helmet`, `cors`, `morgan` — standard middleware
- `multer` — file uploads (logos, staff documents)
- `node-cron` — scheduled jobs (subscription expiry reminders)
- `pdfkit` — invoice PDF generation
- `razorpay` — payment gateway SDK (test mode only)
- `dotenv` — `.env` file loader
- `nodemon` (dev only) — auto-restart on file changes

**Frontend** (11 packages):
- `react` (v19) and `react-dom` — UI framework
- `react-router-dom` (v7) — client-side routing
- `axios` — HTTP client
- `qrcode` — QR code generation for the customer app
- `vite` (dev) — build tool and dev server
- `eslint` plugins (dev) — code linting

Everything else listed in `package.json` is a transitive dependency pulled in automatically.

**Tools NOT installed by npm** (you need these separately, see Prerequisites above):
- Node.js itself (npm comes bundled with it)
- MongoDB Server (the database — runs as a separate service on your machine)
- Git (only needed if you're cloning from a repository)

---

## 2. Configure environment variables

### Backend — `backend/.env`

Create this file (it's gitignored, so it won't already exist):

```
MONGO_URI=mongodb://localhost:27017/fitsync
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRE=90d
PORT=5000
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Email — REQUIRED for new user signups (OTP verification).
# See backend/EMAIL_SETUP.md for how to generate a Gmail App Password.
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

**About `EMAIL_USER` / `EMAIL_PASS`:** new account signups go through OTP verification before they can be approved. The OTP is sent via Gmail. Follow `backend/EMAIL_SETUP.md` step-by-step to generate the 16-character App Password — it takes about 5 minutes. The seeded demo accounts (next section) bypass this step, so you can demo most of the app even without configuring email, but you can't demo the *signup flow itself* without it.

### Frontend — `frontend/.env`

```
VITE_API_URL=http://localhost:5000/api
```

---

## 3. Seed the database

From `backend/`:

```bash
node seedData.js
```

What this does:

- Drops all collections (so re-running it is safe and gives a clean slate)
- Creates 1 superadmin
- Creates 2 demo gyms with full company records (name, address, GST number, owner KYC details, bank/UPI info)
- Creates each gym's customers, memberships, subscriptions, payments, attendance, expenses, enquiries, tasks, targets, branches
- Adds rich profile data on every demo user (gender, DOB, address, avatar)
- Verifies all 4 demo logins work before exiting

You should see this at the end:

```
🔍 Verifying all 4 demo logins...
   ✓ Superadmin (arjun.malhotra@fitsync.com)
   ✓ PowerHouse admin (vikrant.shah@powerhousegym.com)
   ✓ FitZone admin (meera.shah@fitzone.in)
   ✓ Demo customer (rahul.sharma@gmail.com)

🎉 Seed complete!
```

If any of those four show ❌ instead of ✓, stop and check the error — don't proceed to the next step.

---

## 4. Start the backend

```bash
cd backend
npm run dev
```

You should see:

```
✓ Connected to MongoDB
🚀 Server running on http://localhost:5000
[Email] Ready to send emails           ← only if EMAIL_USER/PASS are set
[cron] Subscription reminder job scheduled (daily 00:30 IST)
```

If `[Email] Ready to send emails` doesn't appear, your Gmail credentials aren't being picked up. The signup flow won't work but the demo logins still will.

---

## 5. Start the frontend

In a **new terminal** (leave the backend running):

```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** — you should land on the FitSync landing page.

---

## Demo Logins

All passwords: `123456`

### Gym admins
| Role | Email | What they see |
|---|---|---|
| Superadmin | `arjun.malhotra@fitsync.com` | Platform-wide: all gyms, billing, module pricing, pending approvals |
| PowerHouse admin (Ahmedabad) | `vikrant.shah@powerhousegym.com` | Only PowerHouse Gym data |
| FitZone admin (Surat) | `meera.shah@fitzone.in` | Only FitZone Fitness data |

### Staff (different permission sets — sidebar reflects what they can access)
| Email | Gym | Permissions |
|---|---|---|
| `karan.joshi@powerhousegym.com` | PowerHouse | Manager — Dashboard, Customers, Attendance, Subscriptions, Payments, Memberships, Reports |
| `rina.iyer@powerhousegym.com` | PowerHouse | Trainer — Dashboard, Customers, Attendance only |
| `saurabh.pandya@fitzone.in` | FitZone | Manager — same as Karan plus Enquiries |
| `pooja.nair@fitzone.in` | FitZone | Trainer — limited |

### Customers
| Email | Gym |
|---|---|
| `rahul.sharma@gmail.com` | PowerHouse |
| `priya.patel@gmail.com` | PowerHouse |
| `sanjay.verma@gmail.com` | FitZone |

### Pending approval (cannot log in until superadmin approves)
| Email | Gym |
|---|---|
| `ravi.mehta@ironpump.in` | IronPump Fitness (Vadodara) — sits in superadmin's pending-approvals queue |

All seeded accounts bypass the OTP flow because `isEmailVerified` is set to `true` in the seed — they're for demoing the rest of the app. Use the **Demo Walkthrough** below to see the OTP/approval flow itself.

> **Note on staff sidebar filtering**: when Rina logs in she sees only Dashboard / Customers / Attendance — fewer items than Karan. This is a UI-only restriction; if she manually types `/admin/reports` into the URL bar the page still loads (backend routes don't currently enforce permissions). Honest gap, documented for future work.

---

## Demo Walkthrough

A 12-step tour that hits every major feature. Run through this end-to-end at least once before the viva so nothing surprises you.

### Part A — Multi-tenant data isolation (5 min)

1. **Log in as `vikrant.shah@powerhousegym.com`**. Click *Customers*. You should see 8 PowerHouse customers (Rahul Sharma, Priya Patel, Amit Kumar, etc.).
2. **Log out, log in as `meera.shah@fitzone.in`**. Click *Customers*. You should see 7 different customers (Sanjay Verma, Divya Malhotra, Kiran Rao, etc.).
3. **Critical check:** if either admin can see the other's customers, there's a data-scoping bug. The whole multi-tenant model rests on this. (As of the current build, this is verified working.)

### Part B — Customer self-service (3 min)

4. **Log in as `rahul.sharma@gmail.com`**. The customer dashboard appears, scoped to him only.
5. Click *My Subscription*, *Payments*, *Attendance*. He sees his own data — not anyone else's.
6. Click *Profile*. Rich profile data is populated (blood group, emergency contact, health notes).

### Part C — The new-signup flow with email OTP (5 min — needs Gmail configured)

7. **Log out. Click "Sign up"** (or visit `/signup`).
8. Fill in any gym name + a real email you can check + password. Submit.
9. You're redirected to `/verify-email`. **Check your inbox** — an email titled "Verify your email" arrives within ~30 seconds containing a 6-digit code. (The same code is also printed in the backend terminal in a boxed log, as a fallback.)
10. Enter the code → "Email verified — awaiting approval".
11. **Try to log in immediately** with the new account → friendly amber banner: "Your account is pending approval."
12. **Log in as the superadmin** (`arjun.malhotra@fitsync.com`). Click *Pending Approvals* in the sidebar. The new gym appears. Click *Approve*. Now log in as the new gym admin → success, normal dashboard.

This sequence demonstrates: **mandatory email verification → admin approval → login**. All three gates are active and independent.

### Part D — Trial expiry and module gating (3 min)

13. As superadmin, go to *Gyms*, find the new gym you just created. Confirm its status is `trial` with a trialEndsAt 14 days out.
14. **Optional**: in MongoDB Compass or shell, set `trialEndsAt` to a past date for that gym. Log in as that gym's admin → backend returns 402, frontend redirects to `/subscribe`. (Trial expiry enforcement working.)
15. As superadmin, open *Module Reports* → *Module Pricing*. Toggle off a module (e.g. "reports") for one gym. Log in as that gym's admin → the *Reports* sidebar entry is hidden.

### Part E — Invoicing, GST, billing (5 min)

16. As `vikrant.shah@powerhousegym.com`, go to *Invoices*. Click any invoice → opens a printable PDF with the gym's logo, address, GST number, customer details, line items, and totals.
17. Go to *Reports* → *GST Report (R1 / R2)*. Confirms GSTR-1 (outward supplies) and GSTR-2 (inward supplies) numbers from real payments and expenses.
18. Log in as superadmin → *Billing* → see platform invoices generated for each gym (PINV-2026-NNNN format).

---

## Troubleshooting

Common errors and fixes, in order of how often they hit during fresh setups:

### `Error: connect ECONNREFUSED 127.0.0.1:27017`
MongoDB isn't running. Start it: on Windows, `net start MongoDB`; on macOS, `brew services start mongodb-community`; on Linux, `sudo systemctl start mongod`.

### Seed fails with `E11000 duplicate key error`
Stale unique index from an older schema version. Drop the database manually:
```js
// In MongoDB shell or Compass
use fitsync
db.dropDatabase()
```
Then re-run `node seedData.js`. The seed already drops the right collections on each run, but a stale DB from before this build can carry old indexes.

### Seed fails with `'Staff' is not a valid enum value for path 'category'`
You have an older `seedData.js`. Make sure you've applied the latest batch zip — `category: 'Staff'` should be `'Staff Salary'` or `'Trainer Salary'`.

### Seed fails with `'starter' is not a valid enum value for path 'plan'`
Same family of issue — stale enum value in the seed. Valid Company plans are `trial`, `basic`, `pro`, `enterprise`. The IronPump pending-approval gym should use `plan: 'trial'`.

### Seed fails with `E11000 duplicate key error collection: fitsync.notifications`
The Notification model has a unique compound index on `(subscriptionId, audience, customerId, daysOut, kind)`. If your seed creates multiple admin notifications without setting these fields, they collide as all-null tuples. Each seeded notification needs a real `subscriptionId` and a distinct `daysOut` value. The latest `seedData.js` does this correctly.

### Customer page shows "0 total members" even though seed claims 8 customers
The customer controller scopes queries by `gymId: req.user._id` (legacy "admin user is the tenant" pattern) instead of `companyId`. The seed must set `gymId: admin._id` on each customer record alongside `companyId` — otherwise the customer list is invisible to the gym admin even though the records exist. The latest `seedData.js` does this.

### Customer login (`rahul.sharma@gmail.com`) returns "Invalid email or password"
Express-validator was stripping dots from gmail addresses. Make sure `backend/middleware/validators.js` has the `NORMALIZE_EMAIL` constant with `gmail_remove_dots: false`. If your file doesn't, you're missing the batch 15.5 fix.

### `[Email] Skipped (not configured)` instead of `Ready to send emails`
`EMAIL_USER` or `EMAIL_PASS` is missing or empty in `backend/.env`. Check `backend/EMAIL_SETUP.md` for how to generate a Gmail App Password.

### "Invalid login: 535-5.7.8 Username and Password not accepted"
You're using your regular Gmail password instead of the 16-character App Password. Regular Gmail passwords don't work over SMTP — you need to generate an App Password from Google Account → Security → 2-Step Verification → App passwords.

### Port 5000 already in use
Another process is using it. Either kill it or change `PORT` in `backend/.env`. If you change the port, also update `VITE_API_URL` in `frontend/.env` to match.

### Frontend shows "Network error" after login
Backend isn't running, or `VITE_API_URL` doesn't match the backend's actual port. Check both terminals.

### GST report tab spins forever and never loads
The Reports page used to set `data = {ready: true}` as a sentinel for the GST tab. Batch 21.1 split this into a dedicated `gstReady` boolean — `data` is now array-only. The `renderGstReport()` function's loading guard must check `gstReady`, not `!data`. Latest `Reports.jsx` is correct.

### Owner name shows "undefined undefined" after toggling a module
Superadmin's company-detail page calls a PATCH endpoint that returned the company without populating `ownerId`. Latest `superadminController.js` populates `ownerId` after `updateModules`, `setCompanyStatus`, and `extendTrial` — so the owner name persists across these mutations.

### React console warning about "key" prop on Reports page
Cosmetic, non-blocking. Doesn't affect rendering. Known issue — would need React DevTools to pin down which child element is missing the key. Safe to ignore for the demo.

---

## Security Notes

A few practical things to know if you're sharing or deploying this code:

- **`.env` files contain secrets.** The repository ships an `.env.example` for reference but the real `.env` (with JWT secrets, Razorpay keys, Gmail credentials) should never be committed to git or shipped in zips. Add `.env` to `.gitignore` at both project root and `backend/` if it isn't already.
- **JWT secret rotation.** If the `.env` is ever exposed, rotate `JWT_SECRET` and `JWT_REFRESH_SECRET`. Generate new ones with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. Existing user sessions will be invalidated, which is the point.
- **Rate limiting is on.** `/api/auth/*` endpoints are capped at 20 requests / 15 minutes per IP. Other `/api/*` endpoints at 300 / 15 minutes. Both configurable via `AUTH_RATE_LIMIT_*` and `API_RATE_LIMIT_*` env vars.
- **Password hashing.** Bcrypt with cost factor 12. The `password` field is `select: false` on the User model so it's never returned to the client even via spread operators — login responses use a whitelisted `buildUserResponse()` helper.
- **Multi-tenant isolation.** Every controller scopes queries by either `companyId` (modern pattern, most controllers) or `gymId: req.user._id` (legacy pattern, `customer` and `gymStaff` controllers). Both maintain isolation; the legacy pattern is cosmetically inconsistent but functionally correct.

---

## Architecture Summary

The most important things to be able to explain in the viva:

**Multi-tenancy.** Every document outside `User` and `Company` has a `companyId` field. Every controller scopes its queries with `companyId: req.companyId`. The `attachCompany` middleware looks up the user's company and puts it on `req.company` and `req.companyId` before the controller runs. Without that scoping, one gym could see another's data — which is the single biggest correctness invariant in the system.

**The middleware chain.** Protected routes go through `protect → attachCompany → checkSubscription → moduleGuard → controller`:
- `protect` — verifies the JWT and loads the user
- `attachCompany` — loads the user's company and attaches it
- `checkSubscription` — returns 402 if trial expired or subscription canceled
- `moduleGuard('reports')` — returns 403 if the module isn't enabled for this company

**Roles.**
- `superadmin` — manages the platform itself. Can see all companies, set module prices, approve new gym registrations, view platform billing. Has `companyId: null`.
- `admin` — owns one gym. Sees only their gym's data.
- `staff` — works at one gym, with permission flags for which modules they can use.
- `customer` — a gym member. Sees only their own subscriptions, payments, and attendance.

**Auth gates (in order).** A new gym admin can only log in after passing all three:
1. **Email verification** — clicking the link / entering the OTP from the verification email
2. **Admin approval** — superadmin reviews and approves them in the *Pending Approvals* page
3. **Login** — bcrypt password check, JWT issued, 90-day expiry

OTPs are SHA-256 hashed at rest (same treatment as password reset tokens). Passwords are bcrypt-hashed with cost factor 12.

**Invoice numbering.** Per-company sequential, format `INV-YYYY-NNNN`. Backed by a `Counter` collection with atomic `findOneAndUpdate $inc` so concurrent payments can't collide.

**GST.** Each Payment and Expense optionally carries `gstRate` and `taxableAmount` fields. The Reports → GST page aggregates them into GSTR-1 (outward / sales) and GSTR-2 (inward / purchases) summaries. The current UI doesn't have form fields to enter GST values — they default to 0; the report can preview using a fixed rate as a what-if.

**Modules.** Each Company has a `modules` map. The superadmin toggles modules on/off per gym from *Module Pricing*. The frontend `useModuleEnabled('reports')` hook reads it; backend `moduleGuard('reports')` enforces it. As of this build the `<ModuleDisabled>` UX wrapper is only on the Reports page — other pages return a generic 403 if their module is off, but the sidebar entry is correctly hidden.

---

## File Structure (high-level)

```
backend/
├── models/             # 16 Mongoose schemas, all scoped by companyId
├── controllers/        # 17 controllers (one per resource)
├── routes/             # 17 route files mounted under /api/<resource>
├── middleware/         # auth, company-attach, subscription gate, moduleGuard, multer uploads
├── jobs/               # cron: subscription expiry reminders (daily 00:30 IST)
├── utils/email.js      # Nodemailer transport + transactional templates
├── server.js           # express app bootstrap, route mounts, /uploads static
└── seedData.js         # full demo seed: 2 gyms × everything

frontend/
├── src/
│   ├── pages/          # admin, customer, superadmin, auth, landing
│   ├── components/     # AdminLayout, CustomerLayout, shared/* (ErrorBoundary, ModuleDisabled, etc.)
│   ├── context/        # AuthContext, ToastContext
│   ├── services/       # one per resource — uses utils/api.js
│   ├── hooks/          # useAuth, useModuleEnabled
│   └── utils/api.js    # single axios instance with JWT interceptor
```

---

## Where to look when something feels off

- **A page is empty but the data exists in MongoDB** → probably a `gymId` vs `companyId` scoping mismatch. Check the controller's query filter.
- **A page shows other gyms' data** → critical bug. The query is missing its `companyId` filter. Find and fix immediately.
- **A login that should work returns 401** → check `backend/middleware/validators.js` for the `NORMALIZE_EMAIL` constant; if dots are being stripped from a gmail address, the lookup misses.
- **Invoice numbers collide on re-seed** → the `Counter` collection wasn't cleared. The current seed drops it; older seeds didn't.
- **OTP entered correctly but verification fails** → most likely the user has a stale plaintext OTP from before the SHA-256 hashing change. Re-seed or delete that user.
- **Email isn't arriving** → check the backend terminal for the boxed OTP log. The OTP is always logged there as a fallback even when SMTP is configured.

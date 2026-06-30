# FitSync — Deployment Checklist

Checklist-driven deploy guide. Walk through each section in order before you flip DNS to point at the new server.

If something on the list fails, stop and fix it rather than pushing through. Every item here exists because it's been a production outage somewhere.

---

## Before you start

- [ ] Code is on the `main` branch and the build is green
- [ ] You've tested the exact commit you're about to deploy against a local Mongo with seed data
- [ ] Backup of the production database exists and you know how to restore it
- [ ] You have access to the server logs in case something goes wrong

---

## Environment variables

Copy `.env.example` to `.env` on the production server. Every variable in that file must be reviewed.

- [ ] `NODE_ENV=production` — not `development`. This single flag changes logging, error detail, and proxy trust
- [ ] `MONGO_URI` points at the production database, not `localhost`
- [ ] `JWT_SECRET` is a 64+ character random string — **not** the default and **not** the same as your dev value. Generate:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- [ ] `CLIENT_URL` and `FRONTEND_URL` match the real frontend URL exactly — including `https://` and no trailing slash
- [ ] `TRUST_PROXY=true` if the app is behind Nginx, Cloudflare, Render, Heroku, Railway, Fly, or any other reverse proxy. Without this, rate limiting will treat every request as coming from the proxy's IP
- [ ] Email credentials (`EMAIL_USER`, `EMAIL_PASS`) are set if OTP / password reset / staff invites should actually deliver
- [ ] `.env` is in `.gitignore` and has never been committed

---

## Database

- [ ] Production database has the same Mongoose schema state as dev (no stale indexes that no longer match)
- [ ] Superadmin user exists in the production DB. Run this on the server once:
  ```bash
  cd backend && node seedSuperadmin.js
  ```
  (Use a fresh email and strong password — do **not** reuse `superadmin@fitsync.com` / `123456`)
- [ ] `ModulePrice` records seeded (happens automatically on first server boot)
- [ ] Mongo backups are scheduled (mongodump cron, Atlas automated backups, etc.)

---

## Security

- [ ] All dependencies installed: `npm ci` (not `npm install` — `ci` uses the lockfile exactly)
- [ ] No dev dependencies in production: install with `npm ci --omit=dev`
- [ ] HTTPS is terminated somewhere in front of the app (nginx, Caddy, Cloudflare, load balancer). Never expose Node directly on port 80/443
- [ ] CORS allow-list includes only the real frontend origin. Localhost origins removed from `CLIENT_URL`
- [ ] Rate limit defaults are sensible for real traffic:
  - Auth: 20 failures per 15 min is right for most apps
  - API: 300 requests per 15 min works for individual users; bump higher if you have heavy dashboards
- [ ] Default seeded demo passwords (`123456`) have been changed or the demo accounts deleted

---

## Server boot

- [ ] Server starts cleanly:
  ```bash
  NODE_ENV=production node server.js
  ```
  Expected output:
  ```
  ✅ MongoDB Connected: <your-host>
  🚀 Server running on http://localhost:5000
  [ModulePrice] Default prices seeded
  [cron] Subscription reminder job scheduled (daily 00:30 IST)
  ```
- [ ] A process manager keeps the server alive on crash and restarts after reboot:
  - PM2: `pm2 start server.js --name fitsync && pm2 save && pm2 startup`
  - systemd: unit file installed and enabled
  - Docker: healthcheck + restart policy set
- [ ] `logs/` directory exists and is writable by the Node process
- [ ] Log rotation is configured (logrotate, or the `morgan-file-rotation` route — current setup only rotates by file size)

---

## Smoke tests (run after deploy, before announcing)

Hit the live URLs. For each, record the HTTP status + response body.

- [ ] `GET https://api.yourdomain/api/health` → `200 {"success":true,"message":"FitSync API running"}`
- [ ] `POST https://api.yourdomain/api/auth/register` with valid data → `201` and creates a company
- [ ] `POST https://api.yourdomain/api/auth/login` with that new user → `200` with a JWT
- [ ] `GET https://api.yourdomain/api/auth/me` with the JWT → `200` with user + populated company
- [ ] `GET https://api.yourdomain/api/customers` (as admin) → `200 []` (empty but succeeds)
- [ ] Test in a real browser: sign up, sign in, see the dashboard, log out
- [ ] Rate limit triggers: send 25 bad logins in a loop — request 21+ should return `429`
- [ ] CORS works from the frontend: open DevTools on the real frontend, no CORS errors in console
- [ ] Security headers present: `curl -I https://api.yourdomain/api/health` shows `Strict-Transport-Security`, `X-Content-Type-Options`, etc.

---

## Monitoring

- [ ] `GET /api/health` is pinged every 1-5 min by an external uptime monitor (UptimeRobot, Better Stack, etc.)
- [ ] Alerting is set up for: server down, DB connection lost, error rate spike, disk usage > 80%
- [ ] You know where `logs/access.log` lives and how to `tail -f` it over SSH
- [ ] You know how to restart the app (`pm2 restart fitsync` or equivalent) without SSH panic

---

## Rollback plan

If something breaks badly after deploy:

1. Revert the deploy (git revert, or rollback to previous container image)
2. Restart the service
3. Verify health endpoint is back to green
4. If the DB got migrated, restore the most recent backup
5. Only then investigate what went wrong — don't try to hotfix in production under pressure

---

## Post-deploy

- [ ] Update the changelog / release notes
- [ ] Note the deploy in whatever incident log you keep (even a text file is fine)
- [ ] Monitor error logs for the next 30 minutes
- [ ] Tell the team / guide / stakeholders it's live

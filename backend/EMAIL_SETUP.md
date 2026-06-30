# Email Setup — FitSync Backend

The FitSync backend uses [Nodemailer](https://nodemailer.com/) to send transactional emails (OTP verification, password reset, invitations, expiry reminders, etc.).

**Email configuration is required.** New user signups go through mandatory OTP verification before they can be approved, and the OTP is delivered by email. Without email configured, you can't demo the signup flow — though seeded demo accounts (which bypass verification) still let you demo everything else.

A defense-in-depth fallback: every OTP is also logged to the backend console in a clearly-boxed format. So even when email delivery fails (Gmail throttle, network blip), you can read the code from the terminal during a demo. Configure email anyway — that's the path you're showing to your guide.

---

## Gmail SMTP setup

Gmail allows up to 500 emails/day from a personal account — more than enough for a college project demo.

### Step 1 — Enable 2-Step Verification

App Passwords only exist on Google accounts with 2-Step Verification on. Visit <https://myaccount.google.com/security> and turn it on if you haven't.

### Step 2 — Create an App Password

Visit <https://myaccount.google.com/apppasswords> while signed in to the Gmail account you want to send from. Pick:

- **App:** Mail
- **Device:** Other → name it "FitSync Backend"

Google shows you a 16-character password like `abcd efgh ijkl mnop`. Copy it — Google won't show it again.

### Step 3 — Update `backend/.env`

```env
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM_NAME=FitSync
```

The 16-character password goes in **without spaces**.

### Step 4 — Restart the backend

You should see:

```
[Email] Ready to send emails
```

If you instead see `Invalid login: 535-5.7.8 Username and Password not accepted`, you used your regular Gmail password instead of the App Password — redo Step 2.

---

## Test the configuration

The fastest end-to-end test is the OTP flow:

1. Go to `/signup` and create a new account with a real email you can check
2. You'll be redirected to `/verify-email?email=...`
3. Check your inbox — an email arrives within ~30 seconds with a 6-digit code
4. Also check the backend terminal — the same code appears in a boxed log:
   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ 📧  Email signup OTP                                         │
   │ To:  yourtest@gmail.com                                      │
   │ Code: 482917  (valid for 10 minutes)                         │
   └──────────────────────────────────────────────────────────────┘
   ```
5. Enter the code on the verification page → "Email verified — awaiting approval"

If the email doesn't arrive but you see the boxed log, SMTP is the issue (check the troubleshooting section below). If you don't see either, something more fundamental is wrong (check that the user actually got created in Mongo).

---

## Other providers

The codebase uses `service: 'gmail'` shorthand in `backend/utils/email.js`. To switch providers, replace that block with explicit SMTP settings:

```js
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,                  // false for port 587, true for 465
  auth: {
    user: process.env.EMAIL_USER, // for SendGrid: 'apikey'
    pass: process.env.EMAIL_PASS, // for SendGrid: your API key
  },
})
```

Common providers:

| Provider   | Host                              | Port | User             |
|------------|-----------------------------------|------|------------------|
| SendGrid   | smtp.sendgrid.net                 | 587  | `apikey`         |
| Mailgun    | smtp.mailgun.org                  | 587  | postmaster@...   |
| AWS SES    | email-smtp.{region}.amazonaws.com | 587  | (SMTP credentials) |
| Outlook    | smtp.office365.com                | 587  | your@outlook.com |

---

## Troubleshooting

**`[Email] Skipped (not configured)` on backend boot**
`EMAIL_USER` or `EMAIL_PASS` is empty or missing in `.env`. Signup flow won't deliver real emails — but the OTP is still logged to console as a fallback, so demos still work.

**`Invalid login: 535-5.7.8 Username and Password not accepted`**
You used your regular Gmail password instead of the 16-character App Password. Regular passwords don't work over SMTP. Redo Step 2.

**`Connection timeout`**
ISP or firewall is blocking outbound SMTP (port 465/587). Common on college / corporate networks. Try a different network, mobile hotspot, or switch to SendGrid/Mailgun.

**Emails go to spam**
Normal in development. In production: configure SPF/DKIM/DMARC on your sending domain, or use a transactional provider (SendGrid, Mailgun, Postmark) that handles deliverability for you.

---

## What sends email

| Feature | When it fires | What the user sees |
|---|---|---|
| OTP verification | New signup at `/signup` | "Verify your email" with 6-digit code |
| Password reset | "Forgot password" on login page | Reset link, valid 1 hour |
| Invitations | Gym admin invites a customer; superadmin invites a gym admin | "You've been invited to join [gym]" with accept link |
| Welcome email | Right after register completes | "Welcome to FitSync" |
| Membership expiry reminder | Daily cron 00:30 IST | Sent 15 / 7 / 1 days before subscription expires |

When email is unconfigured, OTPs and invite tokens are still generated and stored in the DB — the OTP appears in the backend console (boxed log), and invite URLs are returned in the API response so the inviter can copy-paste them manually.

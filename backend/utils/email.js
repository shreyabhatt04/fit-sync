// backend/src/utils/email.js
// Nodemailer setup + all email templates used across the app.
// Requires: npm install nodemailer

const nodemailer = require('nodemailer')

// ── Create transporter ─────────────────────────────────────────
// Guard: only create transporter if credentials are set
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
})

// ── Verify connection on startup ───────────────────────────────
// Only verify if credentials are actually configured
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((err) => {
    if (err) console.error('[Email] Transporter error:', err.message)
    else     console.log('[Email] Ready to send emails')
  })
} else {
  console.log('[Email] Skipping email setup — EMAIL_USER/EMAIL_PASS not set in .env')
}

// ── Base HTML wrapper ──────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8e8e8; }
    .header  { background: #111111; padding: 28px 32px; text-align: center; }
    .header-logo { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 2px; }
    .body    { padding: 36px 32px; }
    .footer  { background: #f8f8f8; padding: 20px 32px; text-align: center; font-size: 12px; color: #a0a0a0; border-top: 1px solid #e8e8e8; }
    h2       { font-size: 22px; font-weight: 700; color: #111111; margin: 0 0 12px; }
    p        { font-size: 15px; color: #444444; line-height: 1.7; margin: 0 0 16px; }
    .otp-box { background: #f4f4f4; border: 2px dashed #d0d0d0; border-radius: 10px; text-align: center; padding: 24px; margin: 24px 0; }
    .otp     { font-size: 38px; font-weight: 800; color: #111111; letter-spacing: 8px; }
    .otp-note{ font-size: 13px; color: #808080; margin-top: 8px; }
    .btn     { display: inline-block; background: #111111; color: #ffffff !important; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 16px 0; }
    .btn:hover { background: #000000; }
    .divider { border: none; border-top: 1px solid #e8e8e8; margin: 24px 0; }
    .small   { font-size: 13px; color: #888888; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">💪 FITSYNC</div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      © ${new Date().getFullYear()} FitSync · Gym Management Software<br/>
      You received this email because you signed up at FitSync.
    </div>
  </div>
</body>
</html>
`

// ── Send helper ────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  // Skip silently if email is not configured. Lets the rest of the app
  // call email helpers without checking — login/signup/etc. still work.
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email] Skipped (not configured): "${subject}" to ${to}`)
    return
  }
  const fromName = process.env.EMAIL_FROM_NAME || 'FitSync'
  await transporter.sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

// ══════════════════════════════════════════════════════════════
// EXPORTED EMAIL FUNCTIONS
// ══════════════════════════════════════════════════════════════

// ── 1. OTP Verification ────────────────────────────────────────
exports.sendOtpEmail = async ({ to, name, otp }) => {
  const html = baseTemplate(`
    <h2>Verify your email</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thanks for signing up! Use the OTP below to verify your email address.</p>
    <div class="otp-box">
      <div class="otp">${otp}</div>
      <p class="otp-note">This OTP expires in <strong>10 minutes</strong></p>
    </div>
    <p class="small">If you didn't create a FitSync account, you can safely ignore this email.</p>
  `)
  await sendEmail({ to, subject: 'Verify your FitSync account', html })
}

// ── 2. Password Reset ──────────────────────────────────────────
exports.sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = baseTemplate(`
    <h2>Reset your password</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We received a request to reset your FitSync password. Click the button below to set a new password.</p>
    <div style="text-align:center">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <hr class="divider" />
    <p class="small">This link expires in <strong>30 minutes</strong>. If you didn't request a password reset, ignore this email — your password will remain unchanged.</p>
    <p class="small">Or copy this link: <br/>${resetUrl}</p>
  `)
  await sendEmail({ to, subject: 'Reset your FitSync password', html })
}

// ── 3. Invite Link (admin invites staff) ──────────────────────
exports.sendInviteEmail = async ({ to, gymName, inviterName, role, inviteUrl }) => {
  const html = baseTemplate(`
    <h2>You've been invited!</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${gymName}</strong> on FitSync as a <strong>${role}</strong>.</p>
    <p>Click the button below to accept the invitation and set up your account.</p>
    <div style="text-align:center">
      <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    </div>
    <hr class="divider" />
    <p class="small">This invitation link expires in <strong>48 hours</strong>.</p>
    <p class="small">If you weren't expecting this, you can safely ignore this email.</p>
  `)
  await sendEmail({ to, subject: `You're invited to join ${gymName} on FitSync`, html })
}

// ── 4. Welcome Email (after successful registration) ──────────
exports.sendWelcomeEmail = async ({ to, name, gymName }) => {
  const html = baseTemplate(`
    <h2>Welcome to FitSync! 🎉</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your gym <strong>${gymName}</strong> is all set up on FitSync. Your free 14-day trial has started.</p>
    <p>Here's what you can do during your trial:</p>
    <ul style="color:#444;line-height:2;font-size:15px;">
      <li>Add and manage your gym members</li>
      <li>Track daily attendance</li>
      <li>Collect and record payments</li>
      <li>Set up membership plans</li>
    </ul>
    <div style="text-align:center">
      <a href="${process.env.FRONTEND_URL}/admin/dashboard" class="btn">Go to Dashboard</a>
    </div>
    <hr class="divider" />
    <p class="small">Your trial ends in 14 days. After that, choose a plan to keep your data and continue using FitSync.</p>
  `)
  await sendEmail({ to, subject: `Welcome to FitSync, ${name}!`, html })
}

// ── 5. Subscription Expiry Reminder ───────────────────────────
exports.sendExpiryReminderEmail = async ({ to, gymName, daysLeft, renewUrl }) => {
  const urgency = daysLeft === 1 ? '🚨 Last day!' : daysLeft <= 3 ? '⚠️ Expiring soon' : '📅 Reminder'
  const html = baseTemplate(`
    <h2>${urgency} — Your subscription is expiring</h2>
    <p>Hi,</p>
    <p>Your FitSync subscription for <strong>${gymName}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
    <p>Renew now to avoid any interruption to your gym management.</p>
    <div style="text-align:center">
      <a href="${renewUrl}" class="btn">Renew Subscription</a>
    </div>
    <hr class="divider" />
    <p class="small">If you have any questions, reply to this email and we'll help you out.</p>
  `)
  await sendEmail({
    to,
    subject: `${urgency} Your FitSync subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html,
  })
}

// ── 5b. Membership Expiry (gym customer) ──────────────────────
// Distinct from #5 above. #5 emails the gym admin about their FitSync
// platform subscription. This one emails the gym's customer about their
// own gym membership (e.g. "your monthly Fitness Plus plan ends in 7 days").
exports.sendMembershipExpiryEmail = async ({ to, customerName, gymName, planName, daysLeft, endDate }) => {
  const urgency = daysLeft === 1 ? '🚨 Last day!' : daysLeft <= 7 ? '⚠️ Expiring soon' : '📅 Reminder'
  const dateStr = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const html = baseTemplate(`
    <h2>${urgency} — Your gym membership is ending</h2>
    <p>Hi ${customerName || 'there'},</p>
    <p>Your <strong>${planName || 'gym membership'}</strong> at <strong>${gymName}</strong>
       expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${dateStr}.</p>
    <p>Please renew at the front desk to keep your access active and avoid any break in your routine.</p>
    <hr class="divider" />
    <p class="small">If you've already renewed, please ignore this message.</p>
  `)
  await sendEmail({
    to,
    subject: `${urgency} ${gymName} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    html,
  })
}

// ── 6. Subscription Activated ─────────────────────────────────
exports.sendSubscriptionActiveEmail = async ({ to, gymName, plan, endDate, modules }) => {
  const html = baseTemplate(`
    <h2>Subscription activated ✅</h2>
    <p>Hi,</p>
    <p>Payment received! Your <strong>${plan}</strong> subscription for <strong>${gymName}</strong> is now active.</p>
    <p><strong>Valid until:</strong> ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p><strong>Active modules:</strong> ${modules.join(', ')}</p>
    <div style="text-align:center">
      <a href="${process.env.FRONTEND_URL}/admin/dashboard" class="btn">Go to Dashboard</a>
    </div>
  `)
  await sendEmail({ to, subject: `FitSync subscription active — ${gymName}`, html })
}

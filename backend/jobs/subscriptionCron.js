// jobs/subscriptionCron.js
// Daily job: auto-expire things and send customer membership-expiry alerts.
//
// Two independent responsibilities, run sequentially:
//
//   1. Auto-expire any Company whose trial has ended
//      (status='trial' and trialEndsAt < now → status='expired').
//
//   2. Walk every active Subscription (customer-to-gym membership) and:
//      a) auto-expire the ones whose endDate has passed,
//      b) at 15 / 7 / 1 days before endDate, emit ONE Notification for the
//         customer and ONE for the gym admins, plus a customer-facing
//         email if the customer has one on file. Idempotent via
//         remindersSent flags AND the unique partial index on Notification.
//
// Note: the previous version of this cron was sending a "your FitSync
// platform subscription is expiring" email to the gym admin once per
// active customer subscription — buggy spam. That has been removed.
// Platform-subscription reminders for the gym's own SaaS plan should
// live in a separate iterator over Company.trialEndsAt, which is not
// in scope for this batch.

const cron         = require('node-cron')
const Subscription = require('../models/Subscription')
const Company      = require('../models/Company')
const Customer     = require('../models/Customer')
const Membership   = require('../models/Membership')
const Notification = require('../models/Notification')
const { sendMembershipExpiryEmail } = require('../utils/email')

const daysUntil = (date) =>
    Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))

// Maps a days-until value to the tier flag we should set/check, or null
// if the value isn't at one of the alert thresholds.
const tierFor = (days) => {
    if (days <= 1)  return { key: 'oneDay',     daysOut: 1  }
    if (days <= 7)  return { key: 'sevenDay',   daysOut: 7  }
    if (days <= 15) return { key: 'fifteenDay', daysOut: 15 }
    return null
}

const runSubscriptionCron = async () => {
    console.log('[cron] Running subscription check...')
    try {
        // ── Step 1: Auto-expire trials ─────────────────────────────
        const expiredTrialResult = await Company.updateMany(
            { status: 'trial', trialEndsAt: { $lt: new Date() } },
            { $set: { status: 'expired' } }
        )
        if (expiredTrialResult.modifiedCount > 0) {
            console.log(`[cron] Expired ${expiredTrialResult.modifiedCount} trial(s)`)
        }

        // ── Step 2: Membership expiry alerts ──────────────────────
        const activeSubs = await Subscription.find({ status: 'active' })
            .populate('customer', 'firstName lastName email')
            .populate('membership', 'name planName')
            .populate('companyId', 'name email')

        let alerts = 0
        for (const sub of activeSubs) {
            const days     = daysUntil(sub.endDate)
            const customer = sub.customer
            const company  = sub.companyId

            // Auto-expire past-end-date subscriptions
            if (days <= 0) {
                sub.status = 'expired'
                await sub.save()
                continue
            }
            if (!customer || !company) continue

            const tier = tierFor(days)
            if (!tier) continue

            // Skip if we've already sent the email/notification for this tier
            if (sub.remindersSent && sub.remindersSent[tier.key]) continue

            const planName = sub.membership?.name || sub.membership?.planName || 'membership'
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Member'

            // Create one notification for the customer and one for admins.
            // We rely on the partial unique index (subscriptionId + audience
            // + customerId + daysOut + kind='membership_expiry') to make
            // re-runs idempotent even if remindersSent didn't get persisted.
            const baseDoc = {
                companyId: company._id,
                kind: 'membership_expiry',
                subscriptionId: sub._id,
                daysOut: tier.daysOut,
                title: `Membership expiring in ${tier.daysOut} day${tier.daysOut !== 1 ? 's' : ''}`,
            }

            try {
                await Notification.create({
                    ...baseDoc,
                    audience: 'customer',
                    customerId: customer._id,
                    message: `Your ${planName} expires on ${new Date(sub.endDate).toLocaleDateString('en-IN')}. Please renew at the front desk.`,
                })
            } catch (e) {
                if (e.code !== 11000) console.error('[cron] customer notif error:', e.message)
            }

            try {
                await Notification.create({
                    ...baseDoc,
                    audience: 'admin',
                    customerId: customer._id, // helps the admin UI show whose membership this is
                    message: `${fullName}'s ${planName} expires on ${new Date(sub.endDate).toLocaleDateString('en-IN')}.`,
                })
            } catch (e) {
                if (e.code !== 11000) console.error('[cron] admin notif error:', e.message)
            }

            // Send a customer-facing email if we have one.
            if (customer.email) {
                try {
                    await sendMembershipExpiryEmail({
                        to: customer.email,
                        customerName: fullName,
                        gymName: company.name,
                        planName,
                        daysLeft: tier.daysOut,
                        endDate: sub.endDate,
                    })
                } catch (e) {
                    console.error(`[cron] membership email failed (${customer.email}):`, e.message)
                }
            }

            // Mark this tier as sent so we don't duplicate tomorrow.
            // Initialise the sub-doc if missing (older Subscription docs
            // pre-rename will lack the new field names — Mongoose treats
            // missing fields as undefined, which is fine).
            if (!sub.remindersSent) sub.remindersSent = {}
            sub.remindersSent[tier.key] = true
            await sub.save()
            alerts++
        }

        if (alerts > 0) console.log(`[cron] Sent ${alerts} membership expiry alert(s)`)
        console.log('[cron] Done')
    } catch (err) {
        console.error('[cron] Error:', err)
    }
}

const startSubscriptionCron = () => {
    // 00:30 IST every day
    cron.schedule('30 0 * * *', runSubscriptionCron, { timezone: 'Asia/Kolkata' })
    console.log('[cron] Subscription reminder job scheduled (daily 00:30 IST)')
}

module.exports = { startSubscriptionCron, runSubscriptionCron }

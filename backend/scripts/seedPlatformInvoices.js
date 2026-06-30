// backend/scripts/seedPlatformInvoices.js — Batch 17 (guide feedback #11b)
//
// One-shot demo seeder. Creates ~6 months of monthly platform invoices for
// each non-superadmin Company in the database, with a mix of statuses so
// the SuperadminBilling page has interesting data to demo.
//
// Run with:
//     node backend/scripts/seedPlatformInvoices.js
//
// Idempotent: skips any month that already has an invoice for a given gym.

require('dotenv').config()
const mongoose = require('mongoose')
const Company         = require('../models/Company')
const PlatformInvoice = require('../models/PlatformInvoice')

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI

const SAMPLE_LINE_ITEMS = [
    [
        { module: 'members',     label: 'Members module',     period: 'monthly', amount: 199 },
        { module: 'attendance',  label: 'Attendance module',  period: 'monthly', amount: 199 },
        { module: 'payments',    label: 'Payments module',    period: 'monthly', amount: 299 },
    ],
    [
        { module: 'members',     label: 'Members module',     period: 'monthly', amount: 199 },
        { module: 'attendance',  label: 'Attendance module',  period: 'monthly', amount: 199 },
        { module: 'payments',    label: 'Payments module',    period: 'monthly', amount: 299 },
        { module: 'reports',     label: 'Reports module',     period: 'monthly', amount: 399 },
        { module: 'staff',       label: 'Staff management',   period: 'monthly', amount: 299 },
    ],
    [
        { module: 'members',     label: 'Members module',     period: 'monthly', amount: 199 },
        { module: 'attendance',  label: 'Attendance module',  period: 'monthly', amount: 199 },
        { module: 'payments',    label: 'Payments module',    period: 'monthly', amount: 299 },
        { module: 'memberships', label: 'Memberships module', period: 'monthly', amount: 199 },
        { module: 'tasks',       label: 'Tasks module',       period: 'monthly', amount: 199 },
    ],
]

const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Card']

const main = async () => {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI not set in .env')
        process.exit(1)
    }
    await mongoose.connect(MONGO_URI)
    console.log('✓ Connected to MongoDB')

    const companies = await Company.find({}).lean()
    console.log(`Found ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`)
    if (companies.length === 0) {
        await mongoose.disconnect()
        return
    }

    const now = new Date()
    let created = 0, skipped = 0

    for (const [idx, company] of companies.entries()) {
        // Pick line items for this gym (rotates through the samples so
        // different gyms have different totals — more visually interesting).
        const items = SAMPLE_LINE_ITEMS[idx % SAMPLE_LINE_ITEMS.length]

        // Six months back through current month
        for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
            const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
            const periodEnd   = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0)
            // Issued at the END of the month it covers (typical SaaS billing)
            const issuedAt    = new Date(periodEnd)
            const dueDate     = new Date(periodEnd.getTime() + 15 * 24 * 60 * 60 * 1000)

            // Skip if already exists for this gym + month
            const existing = await PlatformInvoice.findOne({
                companyId: company._id,
                billingPeriodStart: periodStart,
            })
            if (existing) { skipped++; continue }

            const subtotal = items.reduce((s, li) => s + li.amount, 0)
            const gst   = +(subtotal * 0.18).toFixed(2)
            const total = subtotal + gst

            // Status mix: oldest months are paid; current and previous month
            // are due/overdue to give the page something to alert on.
            let status, paidAt, paymentMode
            if (monthsAgo >= 2) {
                status = 'paid'
                // Paid 3-10 days after issue
                paidAt = new Date(issuedAt.getTime() + (3 + (idx % 8)) * 24 * 60 * 60 * 1000)
                paymentMode = PAYMENT_MODES[idx % PAYMENT_MODES.length]
            } else if (monthsAgo === 1) {
                // Last month — overdue if past due date, else still due
                status = dueDate < now ? 'overdue' : 'due'
                paidAt = null
                paymentMode = null
            } else {
                // Current month — issued but not paid yet
                status = 'due'
                paidAt = null
                paymentMode = null
            }

            await PlatformInvoice.create({
                companyId: company._id,
                billingPeriodStart: periodStart,
                billingPeriodEnd: periodEnd,
                lineItems: items,
                subtotal, gst, total,
                status,
                issuedAt,
                dueDate,
                paidAt,
                paymentMode,
                notes: '',
            })
            created++
        }
    }

    console.log(`✓ Created ${created} platform invoice(s)`)
    if (skipped > 0) console.log(`✓ Skipped ${skipped} existing invoice(s)`)
    await mongoose.disconnect()
    console.log('✓ Done')
}

main().catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
})

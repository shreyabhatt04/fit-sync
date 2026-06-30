// backend/seedData.js
// Run: node seedData.js
//
// Creates a fresh multi-tenant demo:
//   - 1 superadmin (no company)
//   - 2 companies: "PowerHouse Gym" + "FitZone Fitness"
//     - Each has 1 admin
//     - Each has its own memberships, customers, subscriptions, payments, etc.
//   - 1 shared demo customer who can log in
//
// Every row is scoped by companyId. If you ever see data from company A
// in company B's dashboard, there's a scoping bug somewhere.

const mongoose = require('mongoose')
const dotenv = require('dotenv')
dotenv.config()

const User = require('./models/User')
const Company = require('./models/Company')
const Customer = require('./models/Customer')
const Membership = require('./models/Membership')
const Subscription = require('./models/Subscription')
const Attendance = require('./models/Attendance')
const Payment = require('./models/Payment')
const Expense = require('./models/Expense')
const Enquiry = require('./models/Enquiry')
const Task = require('./models/Task')
const Target = require('./models/Target')
const Branch = require('./models/Branch')
const ModulePrice = require('./models/ModulePrice')
// Batch 28 additions — extra dummy data so every role's pages have content
const Notification = require('./models/Notification')
const Staff = require('./models/Staff')                  // permissions records
const GymStaff = require('./models/GymStaff')            // HR records
const PlatformInvoice = require('./models/PlatformInvoice')

// ─────────────────────────────────────────────────────────────────
// Helper: create a full gym (company + admin + everything inside)
// ─────────────────────────────────────────────────────────────────
async function seedGym({ companyData, adminData, memberships, customers, expenses, enquiries, tasks, targets, branches }) {
    // 1. Create the company
    const company = await Company.create({
        ...companyData,
        status: 'active',
        plan: 'pro',
        // Unlock all modules for demo purposes
        modules: {
            members: true, attendance: true, payments: true, memberships: true,
            reports: true, tasks: true, targets: true, promotions: true, staff: true,
        },
    })

    // 2. Create the admin linked to that company
    const admin = await User.create({
        ...adminData,
        role: 'admin',
        companyId: company._id,
        isActive: true,
        isEmailVerified: true,
        verificationStatus: 'approved',
    })

    // Back-link: company.ownerId points at the admin
    company.ownerId = admin._id
    await company.save()

    const companyId = company._id

    // 3. Memberships
    const plans = await Membership.insertMany(
        memberships.map(m => ({ ...m, companyId }))
    )
    const planByName = Object.fromEntries(plans.map(p => [p.name, p]))

    // 4. Branches (first one is main)
    await Branch.insertMany(
        branches.map((b, i) => ({ ...b, isMain: i === 0, companyId }))
    )

    // 5. Customers — insert one at a time so pre-save hooks run for each
    const customerDocs = []
    for (let i = 0; i < customers.length; i++) {
        const c = customers[i]
        const doc = await Customer.create({
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            gender: c.gender,
            dateOfBirth: new Date(c.dob),
            address: `${10 + i * 5}, Sample Road, ${companyData.city}, Gujarat`,
            status: c.status,
            joinDate: new Date(new Date('2026-01-01').setDate(1 + i * 2)),
            emergencyContact: { name: 'Family Member', phone: '9999999999' },
            healthNotes: 'No known medical conditions',
            companyId,
            // The customer LIST endpoint scopes queries by `gymId: req.user._id`
            // (legacy "admin user is the tenant" pattern, separate from
            // companyId scoping). Without this, the seed's customers
            // don't show up for the gym admin even though they exist
            // with companyId set. (Batch 28 fix.)
            gymId: admin._id,
        })
        customerDocs.push(doc)
    }

    // 6. Subscriptions + Payments — one per customer
    const subs = []
    const pays = []
    const modes = ['Cash', 'Online', 'Card', 'UPI']
    const payStats = ['paid', 'paid', 'paid', 'due', 'paid']

    for (let i = 0; i < customers.length; i++) {
        const c = customers[i]
        const plan = planByName[c.plan]
        if (!plan) continue

        const startDate = new Date(new Date('2026-01-15').setDate(15 + i * 2))
        const endDate = new Date(startDate)
        const months = { '1 Month': 1, '3 Months': 3, '6 Months': 6, '1 Year': 12 }[plan.duration] || 1
        endDate.setMonth(endDate.getMonth() + months)

        const sub = await Subscription.create({
            customer: customerDocs[i]._id,
            membership: plan._id,
            startDate,
            endDate,
            amount: plan.price,
            status: c.status === 'expired' ? 'expired' : c.status === 'pending' ? 'pending' : 'active',
            companyId,
        })
        subs.push(sub)

        const payDate = new Date(startDate)
        const dueDate = new Date(payDate); dueDate.setDate(dueDate.getDate() + 5)
        const pay = await Payment.create({
            customer: customerDocs[i]._id,
            subscription: sub._id,
            amount: plan.price,
            paymentDate: payDate,
            dueDate,
            mode: modes[i % modes.length],
            status: payStats[i % payStats.length],
            companyId,
        })
        pays.push(pay)
    }

    // 7. Attendance — last 30 days for active customers
    const activeCustomers = customerDocs.filter((_, i) => customers[i].status === 'active')
    const attRecords = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (const cust of activeCustomers) {
        for (let d = 29; d >= 0; d--) {
            const date = new Date(today); date.setDate(date.getDate() - d)
            const isPresent = Math.random() > 0.2
            attRecords.push({
                customer: cust._id,
                date,
                status: isPresent ? 'present' : 'absent',
                checkIn: isPresent ? '06:30 AM' : '',
                checkOut: isPresent ? '08:00 AM' : '',
                companyId,
            })
        }
    }
    // insertMany bypasses pre-save hooks, so normalize the dates manually
    attRecords.forEach(r => { r.date.setHours(0, 0, 0, 0) })
    await Attendance.insertMany(attRecords)

    // 8. Expenses
    await Expense.insertMany(expenses.map(e => ({ ...e, addedBy: admin._id, companyId })))

    // 9. Enquiries
    await Enquiry.insertMany(enquiries.map(e => ({ ...e, companyId })))

    // 10. Tasks
    await Task.insertMany(tasks.map(t => ({ ...t, companyId })))

    // 11. Targets
    await Target.insertMany(targets.map(t => ({ ...t, companyId })))

    return { company, admin, customers: customerDocs, subs, pays, attCount: attRecords.length }
}

// ─────────────────────────────────────────────────────────────────
// Batch 28 — seedExtras
// Adds login users + records that the original seed didn't cover, so
// every role has populated pages on day one of demo. Specifically:
//
//   - Staff Users (so /staff list isn't empty AND staff can log in)
//   - GymStaff records (HR-style records on the staff page)
//   - Extra customer Users (so customer login isn't just Rahul)
//   - Notifications (admin + customer dropdowns have items)
//   - PlatformInvoices (superadmin's billing page has data)
//   - One unapproved gym admin (superadmin's pending-approvals page)
//
// All passwords are 123456 to match the rest of the seed.
// ─────────────────────────────────────────────────────────────────
async function seedExtras(gym1, gym2) {
    // ---- 1. Staff (permissions + login users) ----
    // Two staff per gym. The permission record's `email` is used by
    // the /staff list view; the User record uses the same email so
    // they can log in. Linked via Staff.user.
    const staffSpec = [
        // PowerHouse staff
        {
            gym: gym1,
            firstName: 'Karan', lastName: 'Joshi',
            email: 'karan.joshi@powerhousegym.com',
            phone: '9876543300',
            staffRole: 'manager',
            permissions: ['Dashboard', 'Customers', 'Attendance', 'Subscriptions', 'Payments', 'Memberships', 'Reports'],
        },
        {
            gym: gym1,
            firstName: 'Rina', lastName: 'Iyer',
            email: 'rina.iyer@powerhousegym.com',
            phone: '9876543301',
            staffRole: 'trainer',
            permissions: ['Dashboard', 'Customers', 'Attendance'],
        },
        // FitZone staff
        {
            gym: gym2,
            firstName: 'Saurabh', lastName: 'Pandya',
            email: 'saurabh.pandya@fitzone.in',
            phone: '9876543310',
            staffRole: 'manager',
            permissions: ['Dashboard', 'Customers', 'Attendance', 'Subscriptions', 'Payments', 'Memberships', 'Reports', 'Enquiries'],
        },
        {
            gym: gym2,
            firstName: 'Pooja', lastName: 'Nair',
            email: 'pooja.nair@fitzone.in',
            phone: '9876543311',
            staffRole: 'trainer',
            permissions: ['Dashboard', 'Customers', 'Attendance'],
        },
    ]

    for (const s of staffSpec) {
        const u = await User.create({
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            phone: s.phone,
            password: '123456',
            role: 'staff',
            companyId: s.gym.company._id,
            isActive: true,
            isEmailVerified: true,
            verificationStatus: 'approved',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.firstName + '+' + s.lastName)}&background=10b981&color=fff&size=200`,
        })
        await Staff.create({
            name: `${s.firstName} ${s.lastName}`,
            email: s.email,
            phone: s.phone,
            role: s.staffRole,
            permissions: s.permissions,
            isActive: true,
            user: u._id,
            companyId: s.gym.company._id,
        })
    }
    console.log(`✓ Staff seeded — ${staffSpec.length} accounts (2 per gym)`)

    // ---- 2. GymStaff (HR-style records, no login) ----
    // These appear on the /admin/staff page as employee records.
    // Note: GymStaff schema's unique index is on (email, gymId) where
    // gymId references the gym admin User._id. We set both gymId and
    // companyId so the index works correctly across re-seeds.
    const gymStaffSpec = [
        {
            gym: gym1,
            staffType: 'Trainer',
            name: 'Rina Iyer',           // matches the staff User above
            email: 'rina.iyer@powerhousegym.com',
            phone: '9876543301',
            bloodGroup: 'A+',
            maritalStatus: 'Single',
            dateOfBirth: new Date('1992-08-12'),
            isPersonalTrainer: true,
            personalTrainerSalary: 8000,
            achievements: 'Certified strength & conditioning specialist. 6 years coaching weight-loss programs.',
            monthlySalary: 32000,
        },
        {
            gym: gym1,
            staffType: 'Helpdesk',
            name: 'Vivek Trivedi',
            email: 'vivek.trivedi@powerhousegym.com',
            phone: '9876543302',
            bloodGroup: 'O+',
            maritalStatus: 'Married',
            dateOfBirth: new Date('1988-11-30'),
            monthlySalary: 22000,
        },
        {
            gym: gym1,
            staffType: 'Cleaner',
            name: 'Ramesh Solanki',
            email: 'ramesh@powerhousegym.com',
            phone: '9876543303',
            monthlySalary: 14000,
        },
        {
            gym: gym2,
            staffType: 'Trainer',
            name: 'Pooja Nair',
            email: 'pooja.nair@fitzone.in',
            phone: '9876543311',
            bloodGroup: 'B+',
            maritalStatus: 'Single',
            dateOfBirth: new Date('1994-03-22'),
            isPersonalTrainer: true,
            personalTrainerSalary: 9000,
            achievements: 'CrossFit Level 2 trainer. Specializes in HIIT and functional fitness.',
            monthlySalary: 35000,
        },
        {
            gym: gym2,
            staffType: 'Helpdesk',
            name: 'Anjali Desai',
            email: 'anjali.desai@fitzone.in',
            phone: '9876543312',
            monthlySalary: 24000,
        },
    ]

    for (const g of gymStaffSpec) {
        const { gym, ...rest } = g
        await GymStaff.create({
            ...rest,
            gymId: gym.admin._id,
            companyId: gym.company._id,
        })
    }
    console.log(`✓ GymStaff seeded — ${gymStaffSpec.length} HR records`)

    // ---- 3. Extra customer Users ----
    // Pick one more customer per gym (besides Rahul who's already done)
    // and create a User login for them. Update the Customer record to
    // match (email + .user reference).
    const extraCustomerSpec = [
        {
            gym: gym1,
            customerIndex: 1,           // 2nd customer of gym1
            firstName: gym1.customers[1].firstName,
            lastName:  gym1.customers[1].lastName,
            email: 'priya.patel@gmail.com',
        },
        {
            gym: gym2,
            customerIndex: 0,           // 1st customer of gym2
            firstName: gym2.customers[0].firstName,
            lastName:  gym2.customers[0].lastName,
            email: 'sanjay.verma@gmail.com',
        },
    ]

    for (const c of extraCustomerSpec) {
        const cust = c.gym.customers[c.customerIndex]
        const u = await User.create({
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: cust.phone,
            password: '123456',
            role: 'customer',
            companyId: c.gym.company._id,
            isActive: true,
            isEmailVerified: true,
            verificationStatus: 'approved',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.firstName + '+' + c.lastName)}&background=8b5cf6&color=fff&size=200`,
        })
        // Link customer record to the user
        cust.user = u._id
        cust.email = c.email
        await cust.save()
    }
    console.log(`✓ Extra customer logins seeded — ${extraCustomerSpec.length} customers`)

    // ---- 4. Notifications ----
    // 'membership_expiry' is the only kind currently supported. Note that
    // there's a UNIQUE compound index on
    //   (subscriptionId, audience, customerId, daysOut, kind)
    // when kind === 'membership_expiry' — it's the cron's de-dupe guard.
    // We have to give each notification a distinct (subscriptionId, daysOut)
    // pair so the inserts don't collide. Use the seed's actual subscriptions.
    const now = new Date()
    const notifSpec = []

    for (const gym of [gym1, gym2]) {
        // Admin-audience: 3 expiry warnings, each tied to a different
        // customer's subscription and a different daysOut tier (7, 1, -1).
        notifSpec.push({
            companyId: gym.company._id,
            audience: 'admin',
            subscriptionId: gym.subs[2]._id,
            customerId: gym.customers[2]._id,
            daysOut: 7,
            kind: 'membership_expiry',
            title: 'Membership expiring in 7 days',
            message: `${gym.customers[2].firstName} ${gym.customers[2].lastName}'s subscription expires in 7 days.`,
            read: false,
            createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
        })
        notifSpec.push({
            companyId: gym.company._id,
            audience: 'admin',
            subscriptionId: gym.subs[3]._id,
            customerId: gym.customers[3]._id,
            daysOut: 1,
            kind: 'membership_expiry',
            title: 'Membership expiring in 1 day',
            message: `${gym.customers[3].firstName} ${gym.customers[3].lastName}'s subscription expires tomorrow.`,
            read: false,
            createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 36),
        })
        notifSpec.push({
            companyId: gym.company._id,
            audience: 'admin',
            subscriptionId: gym.subs[4]._id,
            customerId: gym.customers[4]._id,
            daysOut: -1,                  // expired one day ago
            kind: 'membership_expiry',
            title: 'Membership expired yesterday',
            message: `${gym.customers[4].firstName} ${gym.customers[4].lastName}'s subscription expired yesterday.`,
            read: true,
            createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 60),
        })
        // Customer-audience: 14-day pre-renewal nudge for customer[0]
        // (different daysOut than the admin entries → no collision)
        notifSpec.push({
            companyId: gym.company._id,
            audience: 'customer',
            subscriptionId: gym.subs[0]._id,
            customerId: gym.customers[0]._id,
            daysOut: 14,
            kind: 'membership_expiry',
            title: 'Your membership renews soon',
            message: 'Your current plan renews in 14 days. We\'ll auto-charge unless you let us know otherwise.',
            read: false,
            createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
        })
    }

    await Notification.insertMany(notifSpec)
    console.log(`✓ Notifications seeded — ${notifSpec.length} entries`)

    // ---- 5. PlatformInvoices ----
    // 1 monthly invoice per gym, status mix (paid / due) so superadmin's
    // billing page shows real data with filters that work.
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Use Counter for invoice numbering (matches platformBillingController)
    const Counter = require('./models/Counter')

    const piSpec = []
    let i = 0
    for (const gym of [gym1, gym2]) {
        const seq = await Counter.nextSeq(`platform-invoice:${now.getFullYear()}`)
        const invoiceNumber = `PINV-${now.getFullYear()}-${String(seq).padStart(4, '0')}`
        const subtotal = i === 0 ? 4500 : 3200
        const gst = Math.round(subtotal * 0.18)
        piSpec.push({
            invoiceNumber,
            companyId: gym.company._id,
            billingPeriodStart: lastMonthStart,
            billingPeriodEnd: lastMonthEnd,
            lineItems: [
                { module: 'reports',     label: 'Reports module',    period: 'monthly', amount: subtotal * 0.4 },
                { module: 'staff',       label: 'Staff module',      period: 'monthly', amount: subtotal * 0.3 },
                { module: 'promotions',  label: 'Promotions module', period: 'monthly', amount: subtotal * 0.3 },
            ],
            subtotal,
            gst,
            total: subtotal + gst,
            status: i === 0 ? 'paid' : 'due',
            issuedAt: lastMonthEnd,
            dueDate: new Date(lastMonthEnd.getTime() + 1000 * 60 * 60 * 24 * 15),
            paidAt: i === 0 ? new Date(lastMonthEnd.getTime() + 1000 * 60 * 60 * 24 * 5) : null,
            paymentMode: i === 0 ? 'UPI' : null,
        })
        i++
    }

    await PlatformInvoice.insertMany(piSpec)
    console.log(`✓ PlatformInvoices seeded — ${piSpec.length} invoices (1 paid, 1 due)`)

    // ---- 6. One unapproved gym admin (so Pending Approvals isn't empty) ----
    // This signup represents a gym owner who registered, verified email,
    // and is now waiting for superadmin to approve them.
    const pendingCompany = await Company.create({
        name: 'IronPump Fitness',
        slug: 'ironpump-fitness',
        email: 'hello@ironpump.in',
        phone: '0265-2222888',
        address: 'Sayaji Park Road',
        city: 'Vadodara',
        state: 'Gujarat',
        established: 2026,
        status: 'trial',
        plan: 'trial',         // valid Company.plan enum: trial|basic|pro|enterprise
        trialEndsAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14),
    })
    const pendingAdmin = await User.create({
        firstName: 'Ravi',
        lastName: 'Mehta',
        email: 'ravi.mehta@ironpump.in',
        phone: '9988776655',
        password: '123456',
        role: 'admin',
        companyId: pendingCompany._id,
        isActive: true,
        isEmailVerified: true,             // they verified email
        verificationStatus: 'pending',     // waiting for superadmin approval
        avatar: 'https://ui-avatars.com/api/?name=Ravi+Mehta&background=f59e0b&color=fff&size=200',
    })
    pendingCompany.ownerId = pendingAdmin._id
    await pendingCompany.save()
    console.log('✓ Pending approval seeded — IronPump Fitness (Ravi Mehta)')
}

// ─────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────
const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('✓ Connected to MongoDB')

        // Wipe everything
        await Promise.all([
            User.deleteMany({}),
            Company.deleteMany({}),
            Customer.deleteMany({}),
            Membership.deleteMany({}),
            Subscription.deleteMany({}),
            Attendance.deleteMany({}),
            Payment.deleteMany({}),
            Expense.deleteMany({}),
            Enquiry.deleteMany({}),
            Task.deleteMany({}),
            Target.deleteMany({}),
            Branch.deleteMany({}),
            // Batch 28 — clear new collections too so re-seeds are idempotent
            Notification.deleteMany({}),
            Staff.deleteMany({}),
            GymStaff.deleteMany({}),
            PlatformInvoice.deleteMany({}),
        ])
        console.log('🗑  Cleared existing data')

        // Seed module catalog
        await ModulePrice.seedDefaults()

        // Superadmin — platform owner (FitSync founder)
        await User.create({
            firstName: 'Arjun',
            lastName: 'Malhotra',
            email: 'arjun.malhotra@fitsync.com',
            phone: '9876540001',
            password: '123456',
            role: 'superadmin',
            companyId: null,
            isActive: true,
            isEmailVerified: true,
            verificationStatus: 'approved',
            // Profile data — populated so the Settings/Profile page has
            // something real to display rather than a half-empty card.
            gender: 'male',
            dateOfBirth: new Date('1988-03-14'),
            address: '14, Ashram Road, Ellisbridge, Ahmedabad, Gujarat 380006',
            avatar: 'https://ui-avatars.com/api/?name=Arjun+Malhotra&background=10B981&color=fff&size=200',
            preferences: {
                notifications: true,
                theme: 'light',
            },
        })
        console.log('✓ Superadmin created (Arjun Malhotra)')

        const commonMemberships = [
            { name: 'Basic', duration: '1 Month', price: 999, description: 'Perfect for beginners', features: ['Gym floor access', 'Locker room', 'Basic equipment'], color: '#64748b' },
            { name: 'Standard', duration: '3 Months', price: 2499, description: 'Great value for regulars', features: ['All Basic features', 'Group classes', 'Nutrition guide'], color: '#0891b2' },
            { name: 'Premium', duration: '6 Months', price: 4499, description: 'Most popular plan', features: ['All Standard features', 'Personal trainer 2x/month', 'Sauna access'], color: '#7c3aed' },
            { name: 'Elite', duration: '1 Year', price: 7999, description: 'Ultimate fitness experience', features: ['All Premium features', 'Unlimited guest passes', 'Body composition analysis'], color: '#ea580c' },
        ]

        // ── COMPANY 1: PowerHouse Gym (Ahmedabad) ──────────────────
        const gym1 = await seedGym({
            companyData: {
                name: 'PowerHouse Gym',
                slug: 'powerhouse-gym',
                email: 'info@powerhousegym.com',
                phone: '7912345678',
                address: '12, SG Highway, Bodakdev',
                city: 'Ahmedabad',
                state: 'Gujarat',
                established: '2018',
                website: 'https://powerhousegym.in',
                description: 'Premium fitness destination in Ahmedabad. State-of-the-art equipment, expert trainers, and a community that pushes you to be your best.',
                gstNumber: '24ABCDE1234F1Z5',
                owner: {
                    name: 'Vikrant Shah',
                    email: 'vikrant.shah@powerhousegym.com',
                    phone: '9876543200',
                    alternatePhone: '7926581234',
                    dateOfBirth: new Date('1985-07-22'),
                    aadhaarLast4: '7891',
                    panNumber: 'ABCPS1234E',
                    address: '14, Vastrapur Lake Road, Vastrapur, Ahmedabad, Gujarat 380015',
                },
                bankDetails: {
                    bankName: 'HDFC Bank',
                    accountNumber: '50100123456789',
                    ifsc: 'HDFC0001234',
                    accountHolderName: 'PowerHouse Gym Pvt Ltd',
                    upiId: 'powerhouse@okhdfcbank',
                },
            },
            adminData: {
                firstName: 'Vikrant',
                lastName: 'Shah',
                email: 'vikrant.shah@powerhousegym.com',
                phone: '9876543200',
                password: '123456',
                gender: 'male',
                dateOfBirth: new Date('1985-07-22'),
                address: '14, Vastrapur Lake Road, Vastrapur, Ahmedabad, Gujarat 380015',
                avatar: 'https://ui-avatars.com/api/?name=Vikrant+Shah&background=059669&color=fff&size=200',
                preferences: {
                    notifications: true,
                    theme: 'light',
                },
            },
            memberships: commonMemberships,
            branches: [
                { name: 'Main Branch', address: 'SG Highway, Ahmedabad', phone: '7912345678', manager: 'John Admin' },
                { name: 'Satellite', address: 'Satellite, Ahmedabad', phone: '7912345679', manager: 'Raj Patel' },
            ],
            customers: [
                { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul@email.com', phone: '9876543210', gender: 'Male', dob: '1995-05-15', status: 'active', plan: 'Premium' },
                { firstName: 'Priya', lastName: 'Patel', email: 'priya@email.com', phone: '9876543211', gender: 'Female', dob: '1998-08-22', status: 'active', plan: 'Basic' },
                { firstName: 'Amit', lastName: 'Kumar', email: 'amit@email.com', phone: '9876543212', gender: 'Male', dob: '1993-03-10', status: 'active', plan: 'Premium' },
                { firstName: 'Sneha', lastName: 'Gupta', email: 'sneha@email.com', phone: '9876543213', gender: 'Female', dob: '1997-11-05', status: 'expired', plan: 'Standard' },
                { firstName: 'Vikram', lastName: 'Singh', email: 'vikram@email.com', phone: '9876543214', gender: 'Male', dob: '1990-07-18', status: 'active', plan: 'Basic' },
                { firstName: 'Anita', lastName: 'Desai', email: 'anita@email.com', phone: '9876543215', gender: 'Female', dob: '1994-02-28', status: 'active', plan: 'Elite' },
                { firstName: 'Rohan', lastName: 'Mehta', email: 'rohan@email.com', phone: '9876543216', gender: 'Male', dob: '1996-09-14', status: 'expired', plan: 'Standard' },
                { firstName: 'Kavita', lastName: 'Reddy', email: 'kavita@email.com', phone: '9876543217', gender: 'Female', dob: '1992-12-01', status: 'active', plan: 'Premium' },
            ],
            expenses: [
                { category: 'Rent', description: 'Monthly gym rent - April', amount: 25000, date: new Date('2026-04-01') },
                { category: 'Utilities', description: 'Electricity & water - April', amount: 8500, date: new Date('2026-04-05') },
                { category: 'Trainer Salary', description: 'Trainer salary - April', amount: 35000, date: new Date('2026-04-30') },
                { category: 'Equipment', description: 'New treadmill purchase', amount: 45000, date: new Date('2026-03-15') },
                { category: 'Marketing', description: 'Social media ads - March', amount: 5000, date: new Date('2026-03-10') },
            ],
            enquiries: [
                { name: 'Riya Shah', phone: '9876500001', email: 'riya@email.com', source: 'Walk-in', interestedIn: 'Premium', status: 'converted', notes: 'Joined already' },
                { name: 'Karan Mehta', phone: '9876500002', email: 'karan@email.com', source: 'Website', interestedIn: 'Standard', status: 'follow-up', notes: 'Will follow up' },
                { name: 'Nisha Patel', phone: '9876500003', email: 'nisha@email.com', source: 'Referral', interestedIn: 'Basic', status: 'new', notes: '' },
                { name: 'Suresh Kumar', phone: '9876500004', email: 'suresh@email.com', source: 'Call', interestedIn: 'Premium', status: 'lost', notes: 'Went elsewhere' },
            ],
            tasks: [
                { title: 'Update membership pricing', description: 'Review Q2 prices', priority: 'high', status: 'todo', dueDate: new Date('2026-04-30'), assignedTo: 'Admin' },
                { title: 'Send renewal reminders', description: 'Email expiring members', priority: 'medium', status: 'todo', dueDate: new Date('2026-04-25'), assignedTo: 'Admin' },
                { title: 'Website redesign', description: 'Update with new offers', priority: 'medium', status: 'inprogress', dueDate: new Date('2026-05-10'), assignedTo: 'Admin' },
                { title: 'March attendance report', description: 'Shared with management', priority: 'low', status: 'done', dueDate: new Date('2026-03-31'), assignedTo: 'Admin' },
            ],
            targets: [
                { title: 'Monthly Revenue', type: 'Revenue', target: 100000, current: 65000, unit: '₹', deadline: new Date('2026-04-30') },
                { title: 'New Members', type: 'Members', target: 20, current: 12, unit: 'members', deadline: new Date('2026-04-30') },
            ],
        })
        console.log(`✓ Company 1: ${gym1.company.name} — ${gym1.customers.length} customers, ${gym1.attCount} attendance records`)

        // ── COMPANY 2: FitZone Fitness (Surat) ─────────────────────
        const gym2 = await seedGym({
            companyData: {
                name: 'FitZone Fitness',
                slug: 'fitzone-fitness',
                email: 'hello@fitzone.in',
                phone: '2612345678',
                address: '203, Adajan Patia',
                city: 'Surat',
                state: 'Gujarat',
                established: '2020',
                website: 'https://fitzone.in',
                description: 'Surat\'s friendliest neighbourhood gym. Expert coaching, group classes, and personal attention for every member.',
                gstNumber: '24FGHIJ5678K2Z9',
                owner: {
                    name: 'Meera Shah',
                    email: 'meera.shah@fitzone.in',
                    phone: '9876543300',
                    alternatePhone: '2612345679',
                    dateOfBirth: new Date('1990-11-08'),
                    aadhaarLast4: '4523',
                    panNumber: 'FGHPS5678K',
                    address: '7B, Citylight Road, Athwa, Surat, Gujarat 395007',
                },
                bankDetails: {
                    bankName: 'ICICI Bank',
                    accountNumber: '50200987654321',
                    ifsc: 'ICIC0009876',
                    accountHolderName: 'FitZone Fitness',
                    upiId: 'fitzone@okicici',
                },
            },
            adminData: {
                firstName: 'Meera',
                lastName: 'Shah',
                email: 'meera.shah@fitzone.in',
                phone: '9876543300',
                password: '123456',
                gender: 'female',
                dateOfBirth: new Date('1990-11-08'),
                address: '7B, Citylight Road, Athwa, Surat, Gujarat 395007',
                avatar: 'https://ui-avatars.com/api/?name=Meera+Shah&background=ec4899&color=fff&size=200',
                preferences: {
                    notifications: true,
                    theme: 'light',
                },
            },
            memberships: commonMemberships,
            branches: [
                { name: 'Adajan Branch', address: 'Adajan, Surat', phone: '2612345678', manager: 'Meera Shah' },
            ],
            customers: [
                { firstName: 'Deepak', lastName: 'Yadav', email: 'deepak@email.com', phone: '9876543218', gender: 'Male', dob: '1999-04-25', status: 'pending', plan: 'Basic' },
                { firstName: 'Meera', lastName: 'Joshi', email: 'meera@email.com', phone: '9876543219', gender: 'Female', dob: '1991-06-30', status: 'active', plan: 'Elite' },
                { firstName: 'Arjun', lastName: 'Nair', email: 'arjun@email.com', phone: '9876543220', gender: 'Male', dob: '1995-01-08', status: 'active', plan: 'Standard' },
                { firstName: 'Pooja', lastName: 'Shah', email: 'pooja@email.com', phone: '9876543221', gender: 'Female', dob: '2000-10-17', status: 'expired', plan: 'Basic' },
                { firstName: 'Kiran', lastName: 'Rao', email: 'kiran@email.com', phone: '9876543222', gender: 'Male', dob: '1988-03-22', status: 'active', plan: 'Premium' },
                { firstName: 'Divya', lastName: 'Malhotra', email: 'divya@email.com', phone: '9876543223', gender: 'Female', dob: '1993-07-11', status: 'active', plan: 'Standard' },
                { firstName: 'Sanjay', lastName: 'Verma', email: 'sanjay@email.com', phone: '9876543224', gender: 'Male', dob: '1985-09-03', status: 'active', plan: 'Elite' },
            ],
            expenses: [
                { category: 'Rent', description: 'April rent', amount: 20000, date: new Date('2026-04-01') },
                { category: 'Utilities', description: 'April utilities', amount: 6000, date: new Date('2026-04-05') },
                { category: 'Staff Salary', description: 'Staff salary - April', amount: 28000, date: new Date('2026-04-30') },
            ],
            enquiries: [
                { name: 'Anjali Gupta', phone: '9876500005', email: 'anjali@email.com', source: 'Walk-in', interestedIn: 'Elite', status: 'converted', notes: 'Annual plan' },
                { name: 'Mohit Verma', phone: '9876500006', email: 'mohit@email.com', source: 'Website', interestedIn: 'Standard', status: 'follow-up', notes: 'Needs time' },
                { name: 'Shreya Jain', phone: '9876500007', email: 'shreya@email.com', source: 'Referral', interestedIn: 'Premium', status: 'new', notes: '' },
            ],
            tasks: [
                { title: 'Purchase new equipment', description: 'Order 2 treadmills', priority: 'low', status: 'todo', dueDate: new Date('2026-05-15'), assignedTo: 'Admin' },
                { title: 'Staff training schedule', description: 'Monthly trainer sessions', priority: 'high', status: 'inprogress', dueDate: new Date('2026-04-22'), assignedTo: 'Admin' },
            ],
            targets: [
                { title: 'Quarterly Revenue', type: 'Revenue', target: 250000, current: 140000, unit: '₹', deadline: new Date('2026-06-30') },
            ],
        })
        console.log(`✓ Company 2: ${gym2.company.name} — ${gym2.customers.length} customers, ${gym2.attCount} attendance records`)

        // ── Shared demo customer login ──────────────────────────────
        // Links to the first customer of Company 1 (Rahul Sharma) so they
        // can log in and see their own membership/payment/attendance.
        const firstCustomer = gym1.customers[0]
        const customerUser = await User.create({
            firstName: firstCustomer.firstName,
            lastName: firstCustomer.lastName,
            email: 'rahul.sharma@gmail.com',
            phone: firstCustomer.phone,
            password: '123456',
            role: 'customer',
            companyId: gym1.company._id,
            isActive: true,
            isEmailVerified: true,
            verificationStatus: 'approved',
            // Profile data so the customer's "My Profile" page renders
            // a full record rather than a half-empty card.
            gender: 'male',
            dateOfBirth: new Date('1995-05-15'),
            address: '8, Drive-In Road, Thaltej, Ahmedabad, Gujarat 380054',
            avatar: 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=3b82f6&color=fff&size=200',
            preferences: {
                notifications: true,
                theme: 'light',
            },
        })
        // Link the Customer record back to the User account, AND backfill
        // customer-specific personal data (emergency contact, health notes,
        // bloodGroup, etc.) so the gym admin's customer-detail view also
        // looks rich for this seed.
        firstCustomer.user = customerUser._id
        firstCustomer.email = 'rahul.sharma@gmail.com'  // so getMe's companyId lookup by email works
        firstCustomer.bloodGroup = 'B+'
        firstCustomer.maritalStatus = 'Single'
        firstCustomer.address = '8, Drive-In Road, Thaltej, Ahmedabad, Gujarat 380054'
        firstCustomer.city = 'Ahmedabad'
        firstCustomer.state = 'Gujarat'
        firstCustomer.profilePhoto = 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=3b82f6&color=fff&size=200'
        firstCustomer.emergencyContact = {
            name: 'Sunita Sharma',     // mother
            phone: '9876500099',
        }
        firstCustomer.healthNotes = 'No known allergies. History of mild asthma — keeps inhaler in gym bag. Cleared for cardio and strength training by Dr. Patel (April 2026).'
        await firstCustomer.save()

        // ── Batch 28: dummy data for all role logins ───────────────
        // Adds staff users, extra customers, notifications, platform
        // invoices, and one pending-approval gym admin so that every
        // role's pages have content to show after a fresh seed.
        await seedExtras(gym1, gym2)

        console.log('\n🎉 Seed complete!')
        console.log('────────────────────────────────────────────────────────')
        console.log('🔑 Login credentials (password for all: 123456)')
        console.log('')
        console.log('   SUPERADMIN')
        console.log('   • arjun.malhotra@fitsync.com')
        console.log('')
        console.log('   GYM ADMINS')
        console.log('   • vikrant.shah@powerhousegym.com   (PowerHouse — Ahmedabad)')
        console.log('   • meera.shah@fitzone.in            (FitZone    — Surat)')
        console.log('')
        console.log('   STAFF')
        console.log('   • karan.joshi@powerhousegym.com    (PowerHouse manager)')
        console.log('   • rina.iyer@powerhousegym.com      (PowerHouse trainer)')
        console.log('   • saurabh.pandya@fitzone.in        (FitZone manager)')
        console.log('   • pooja.nair@fitzone.in            (FitZone trainer)')
        console.log('')
        console.log('   CUSTOMERS')
        console.log('   • rahul.sharma@gmail.com           (PowerHouse member)')
        console.log('   • priya.patel@gmail.com            (PowerHouse member)')
        console.log('   • sanjay.verma@gmail.com           (FitZone member)')
        console.log('')
        console.log('   PENDING APPROVAL (cannot log in until superadmin approves)')
        console.log('   • ravi.mehta@ironpump.in           (IronPump — Vadodara)')
        console.log('────────────────────────────────────────────────────────')
        console.log('💡 Log in as both admins to verify data isolation:')
        console.log('   - vikrant.shah@powerhousegym.com sees PowerHouse customers only')
        console.log('   - meera.shah@fitzone.in          sees FitZone customers only')
        console.log('   - If one sees the other, there is a scoping bug.')
        console.log('────────────────────────────────────────────────────────')
        process.exit(0)
    } catch (err) {
        console.error('✗ Seed failed:', err.message)
        console.error(err)
        process.exit(1)
    }
}

seed()

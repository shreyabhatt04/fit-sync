// backend/seedSuperadmin.js
// Run once: node seedSuperadmin.js
// Creates the superadmin user if one doesn't already exist.

require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

const SUPERADMIN = {
    firstName: 'Super',
    lastName:  'Admin',
    email:     'superadmin@fitsync.com',
    password:  'SuperAdmin@123',   // change this on first login!
    role:      'superadmin',
    companyId: null,
    isActive:  true,
    isEmailVerified:    true,
    verificationStatus: 'approved',
}

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('✓ Connected to MongoDB')

        const existing = await User.findOne({ role: 'superadmin' })
        if (existing) {
            console.log('⚠  Superadmin already exists:', existing.email)
            process.exit(0)
        }

        await User.create(SUPERADMIN)
        console.log('✓ Superadmin created successfully')
        console.log('  Email   :', SUPERADMIN.email)
        console.log('  Password:', SUPERADMIN.password)
        console.log('  ⚠  Change this password after first login!')
        process.exit(0)
    } catch (err) {
        console.error('✗ Seed failed:', err.message)
        process.exit(1)
    }
}

seed()

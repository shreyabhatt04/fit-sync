const mongoose = require('mongoose')
const dotenv = require('dotenv')
const User = require('./models/User')

dotenv.config()

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('Connected to MongoDB')

        // Delete existing demo users
        await User.deleteMany({ email: { $in: ['admin@fitsync.com', 'customer@fitsync.com'] } })

        // Create admin
        await User.create({
            name: 'John Admin',
            email: 'admin@fitsync.com',
            phone: '9876543200',
            password: '123456',
            role: 'admin',
        })

        // Create customer
        await User.create({
            name: 'Rahul Sharma',
            email: 'customer@fitsync.com',
            phone: '9876543210',
            password: '123456',
            role: 'customer',
        })

        console.log('✅ Demo users created!')
        console.log('   Admin: admin@fitsync.com / 123456')
        console.log('   Customer: customer@fitsync.com / 123456')
        process.exit(0)
    } catch (err) {
        console.error('Seed error:', err)
        process.exit(1)
    }
}

seed()
const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
    phone: { type: String, required: [true, 'Phone is required'] },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed', ''], default: '' },
    anniversary: { type: Date },
    address: { type: String },
    state: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    profilePhoto: { type: String, default: '' },
    emergencyContact: {
        name: { type: String },
        phone: { type: String },
    },
    healthNotes: { type: String },
    // Trainer assignment (Batch 10) — references GymStaff with staffType='Trainer'
    assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'GymStaff', default: null },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending', 'inactive'],
        default: 'pending',
    },
    joinDate: { type: Date, default: Date.now },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false },
}, { timestamps: true })

customerSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`
})

module.exports = mongoose.model('Customer', customerSchema)

const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    date:     { type: Date, required: true },
    status:   { type: String, enum: ['present', 'absent'], required: true },
    checkIn:  { type: String, default: '' },
    checkOut: { type: String, default: '' },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

// Normalize to midnight so the unique index below enforces "one record per day"
attendanceSchema.pre('save', function (next) {
    if (this.date) {
        const d = new Date(this.date)
        d.setHours(0, 0, 0, 0)
        this.date = d
    }
    next()
})

attendanceSchema.index({ customer: 1, date: 1 }, { unique: true })
attendanceSchema.index({ companyId: 1, date: -1 })

module.exports = mongoose.model('Attendance', attendanceSchema)

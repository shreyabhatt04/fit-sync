const mongoose = require('mongoose')

const expenseSchema = new mongoose.Schema({
    category: {
        type: String,
        // Filtered from the guide's list — only gym-relevant categories kept.
        // Dropped: 'Motor Vehicle Gas Purchase' (too specific to transport businesses),
        //         'Entertainment' (rarely a gym expense), 'Fees' (ambiguous)
        enum: [
            'Equipment',
            'Rent',
            'Utilities',        // generic catchall (keeps backward-compat)
            'Electricity',
            'Telephone',
            'Internet',
            'Staff Salary',
            'Trainer Salary',
            'Cleaning',
            'Maintenance',
            'Marketing',
            'Fuel',
            'Travel',
            'Transport',
            'Meals',
            'Taxes',
            'Insurance',
            'Supplies',
            'Other',
        ],
        required: true,
    },
    description: { type: String, required: [true, 'Description is required'] },
    amount: { type: Number, required: [true, 'Amount is required'], min: 0 },
    date: { type: Date, required: true, default: Date.now },

    // ─── GST fields (optional) — Batch 15, guide feedback #9c ───
    // Mirror of the GST fields on Payment, but for inward supplies (purchases)
    // which feed the GSTR-2 report. Default rate 0 keeps existing rows
    // backward-compatible.
    gstRate: { type: Number, default: 0, min: 0, max: 28 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    // Optional supplier metadata for GSTR-2. Filled in when the gym is
    // claiming input tax credit on a purchase from a registered supplier.
    supplierName: { type: String, trim: true, default: '' },
    supplierGstin: { type: String, trim: true, uppercase: true, default: '' },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: false },
}, { timestamps: true })

module.exports = mongoose.model('Expense', expenseSchema)

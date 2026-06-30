const mongoose = require('mongoose')

const branchSchema = new mongoose.Schema({
    name:    { type: String, required: [true, 'Branch name is required'], trim: true },
    address: { type: String, trim: true, default: '' },
    phone:   { type: String, trim: true, default: '' },
    manager: { type: String, trim: true, default: '' },
    isMain:  { type: Boolean, default: false },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

module.exports = mongoose.model('Branch', branchSchema)

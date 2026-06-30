const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title:       { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status:      { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
    dueDate:     { type: Date },
    assignedTo:  { type: String, default: 'Admin' },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
    },
}, { timestamps: true })

taskSchema.index({ companyId: 1, status: 1 })

module.exports = mongoose.model('Task', taskSchema)

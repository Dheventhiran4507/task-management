const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: {
        type: String,
        required: true,
        enum: ['Designing', 'Development', 'Marketing', 'Service', 'Executive', 'Operations']
    },
    description: { type: String },
    projectName: { type: String },
    capabilities: [{ type: String }],
    deadline: { type: Date },
    createdBy: { type: String }, // Username of the creator
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', TeamSchema);

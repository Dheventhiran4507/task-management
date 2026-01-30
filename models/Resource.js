const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: {
        type: String,
        enum: ['Document', 'Link', 'Tool', 'Internal'],
        default: 'Document'
    },
    url: { type: String }, // Optional for initiatives
    description: { type: String },
    department: { type: String },
    targetTeam: { type: String },
    complexity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    impact: { type: String, enum: ['Steady', 'Growth', 'Disruptive'], default: 'Steady' },
    tags: [{ type: String }],
    addedBy: { type: String, default: 'System' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resource', ResourceSchema);

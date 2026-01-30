const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: {
        type: String,
        enum: ['Product', 'Internal Tool', 'Service Update', 'Strategic'],
        default: 'Product'
    },
    completionDate: { type: Date, default: Date.now },
    description: { type: String },
    team: { type: String },
    impact: { type: String },
    imageUrl: { type: String },
    stats: {
        users: { type: Number, default: 0 },
        efficiency: { type: String }
    },
    status: { type: String, default: 'Shipped' },
    addedBy: { type: String, default: 'System' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);

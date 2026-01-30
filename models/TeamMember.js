const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String },
    email: { type: String },
    phone: { type: String },
    avatar: { type: String },
    status: {
        type: String,
        enum: ['online', 'away', 'offline', 'on-leave'],
        default: 'offline'
    },
    department: { type: String },
    teamName: { type: String },
    addedBy: { type: String },
    performanceScore: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeamMember', TeamMemberSchema);

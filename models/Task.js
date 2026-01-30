const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'testing', 'in-review', 'blocked', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    team: { type: String, required: true },
    projectName: { type: String },
    assignee: { type: String },
    createdBy: { type: String }, // Track who created the task
    deadline: { type: Date },
    subTasks: [{
        title: String,
        completed: { type: Boolean, default: false }
    }],
    comments: [{
        user: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);

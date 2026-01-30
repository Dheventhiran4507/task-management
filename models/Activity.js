const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
    activityType: {
        type: String,
        enum: [
            'task_created',
            'task_updated',
            'task_status_changed',
            'task_completed',
            'task_deleted',
            'team_created',
            'team_joined',
            'team_updated',
            'member_added',
            'project_added',
            'login',
            'logout'
        ],
        required: true
    },
    employee: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['task', 'team', 'project', 'member', 'none'],
            default: 'none'
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        },
        entityName: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Index for efficient querying by employee and date
ActivitySchema.index({ employee: 1, timestamp: -1 });
ActivitySchema.index({ timestamp: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);

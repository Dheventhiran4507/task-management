const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
    type: { type: String, enum: ['current', 'permanent', 'mailing', 'office', 'worksite', 'emergency'] },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    contactPerson: String, // For emergency contact
    relation: String // For emergency contact
});

const EducationSchema = new mongoose.Schema({
    level: { type: String, enum: ['high-school', 'undergrad', 'postgrad', 'certification', 'other'] },
    institution: String,
    degree: String,
    fieldOfStudy: String,
    startYear: String,
    endYear: String,
    grade: String
});

const EmployeeSchema = new mongoose.Schema({
    personal: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: String,
        dob: Date,
        gender: String,
        nationality: String
    },
    profile: {
        role: { type: String },
        department: { type: String },
        team: { type: String }, // NEW: Assigned Team
        bio: String,
        avatar: { type: String, default: 'avatar.png' },
        performanceScore: { type: Number, default: 0 },
        joinedAt: { type: Date, default: Date.now }
    },
    addresses: [AddressSchema],
    education: [EducationSchema],
    skills: [String],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', EmployeeSchema);

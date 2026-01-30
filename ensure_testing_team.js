require('dotenv').config();
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    description: String,
    projectName: String,
    capabilities: [String],
    deadline: Date,
    createdBy: String
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);

async function createTestingTeam() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existing = await Team.findOne({ name: 'Testing Team' });
        if (existing) {
            console.log('Testing Team already exists.');
        } else {
            await Team.create({
                name: 'Testing Team',
                department: 'Quality Assurance',
                description: 'Mandatory quality gate for all production releases.',
                createdBy: 'System'
            });
            console.log('Testing Team created successfully.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

createTestingTeam();

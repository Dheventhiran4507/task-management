const mongoose = require('mongoose');
require('dotenv').config();
const Team = require('./models/Team');

async function seedTestingTeams() {
    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const teams = [
            {
                name: 'lexmanan',
                department: 'Testing',
                projectName: 'Testing Operations Alpha',
                description: 'Specialized testing unit for Lexmanan operations.',
                createdBy: 'admin',
                deadline: new Date('2026-12-31')
            },
            {
                name: 'bharathi',
                department: 'Testing',
                projectName: 'Testing Operations Beta',
                description: 'Specialized testing unit for Bharathi operations.',
                createdBy: 'admin',
                deadline: new Date('2026-12-31')
            }
        ];

        for (const t of teams) {
            // Check if exists, update or create
            await Team.findOneAndUpdate({ name: t.name }, t, { upsert: true, new: true });
        }
        console.log('Testing teams "lexmanan" and "bharathi" successfully created by admin.');
    } catch (err) {
        console.error('Error seeding testing teams:', err);
    } finally {
        await mongoose.connection.close();
    }
}

seedTestingTeams();

const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');
const Team = require('./models/Team');

async function dumpInfo() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tasks = await Task.find({}, 'title team status');
        const teams = await Team.find({}, 'name description');

        console.log('--- TEAMS ---');
        teams.forEach(t => console.log(`"${t.name}"`));

        console.log('\n--- TASKS ---');
        tasks.forEach(t => console.log(`Team: "${t.team}" | Status: "${t.status}" | Title: "${t.title}"`));

        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
}

dumpInfo();

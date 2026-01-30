const mongoose = require('mongoose');
const TeamMember = require('./models/TeamMember');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const members = await TeamMember.find({});
        console.log('TEAM_MEMBERS:', members.length);
        members.forEach(m => console.log(`MEMBER: ${m.name} | EMAIL: ${m.email}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();

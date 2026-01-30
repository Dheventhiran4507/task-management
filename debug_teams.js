const mongoose = require('mongoose');
require('dotenv').config();
const Team = require('./models/Team');

async function checkTeams() {
    await mongoose.connect(process.env.MONGODB_URI);
    const teams = await Team.find();
    console.log(JSON.stringify(teams, null, 2));
    process.exit();
}
checkTeams();

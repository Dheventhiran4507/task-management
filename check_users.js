const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({}, 'username role employeeId');
        console.log('USER_COUNT:', users.length);
        users.forEach(u => console.log(`USER: ${u.username} | ROLE: ${u.role} | ID: ${u.employeeId}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();

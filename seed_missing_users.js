require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TeamMember = require('./models/TeamMember');

const newUsers = [
    { name: 'Krish Name', username: 'krish', password: 'krish123', email: 'krish@taskflow.office', role: 'employee' },
    { name: 'Mahu Name', username: 'mahu', password: 'mahu123', email: 'mahu@taskflow.office', role: 'employee' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        for (const u of newUsers) {
            // Check if user already exists
            const exists = await User.findOne({ username: u.username });
            if (exists) {
                console.log(`User ${u.username} already exists.`);
                continue;
            }

            // Create TeamMember first
            const member = new TeamMember({
                name: u.name,
                email: u.email,
                role: 'Employee',
                department: 'Development', // Default dept
                teamName: 'Core Engine', // Default team
                status: 'online',
                joinedAt: new Date()
            });
            const savedMember = await member.save();
            console.log(`Created Member: ${u.name}`);

            // Create User
            const user = new User({
                username: u.username,
                password: u.password,
                role: u.role,
                employeeId: savedMember._id
            });
            await user.save();
            console.log(`Created Credentials for: ${u.username}`);
        }

        console.log('Seeding Complete');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected');
        const users = await User.find({});
        console.log('Total Users:', users.length);
        users.forEach(u => {
            console.log(`- Username: ${u.username}, Role: ${u.role}, HashStart: ${u.password.substring(0, 10)}...`);
        });
        process.exit();
    })
    .catch(err => console.error(err));

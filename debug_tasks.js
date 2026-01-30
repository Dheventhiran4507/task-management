const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');

async function checkTasks() {
    await mongoose.connect(process.env.MONGODB_URI);
    const tasks = await Task.find();
    console.log(JSON.stringify(tasks, null, 2));
    process.exit();
}
checkTasks();

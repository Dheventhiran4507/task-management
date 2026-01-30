require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Task = require('./models/Task');
const TeamMember = require('./models/TeamMember');
const Employee = require('./models/Employee');
const Team = require('./models/Team');
const Project = require('./models/Project');
const User = require('./models/User');
const Activity = require('./models/Activity');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests) or file://
        if (!origin || origin === 'null') return callback(null, true);
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        await seedDatabase();
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

async function seedDatabase() {
    try {
        let employee = await Employee.findOne();
        if (!employee) {
            employee = new Employee({
                personal: {
                    firstName: 'Alex',
                    lastName: 'Rivera',
                    email: 'alex.rivera@taskflow.office',
                    phone: '+1 234 567 890',
                    gender: 'Male'
                },
                profile: {
                    role: 'Lead Associate',
                    department: 'Development',
                    team: 'Core Engine',
                    bio: 'Driving organizational excellence through digital transformation.',
                    performanceScore: 98
                },
                addresses: [{ type: 'office', city: 'London', state: 'UK' }],
                education: [{ level: 'undergrad', institution: 'Oxford University', degree: 'MBA' }]
            });
            await employee.save();
        }

        const teamCount = await Team.countDocuments();
        if (teamCount === 0) {
            const initialTeams = [
                { name: 'Visual Creators', department: 'Designing', description: 'UI/UX and branding excellence.' },
                { name: 'Core Engine', department: 'Development', description: 'Building the backbone of TaskFlow.' },
                { name: 'Growth Hackers', department: 'Marketing', description: 'Driving user acquisition.' },
                { name: 'Support Heroes', department: 'Service', description: 'Dedicated to user success.' },
                { name: 'Testing Team', department: 'Quality Assurance', description: 'Mandatory quality gate for all production releases.' }
            ];
            await Team.insertMany(initialTeams);

            const initialMembers = [
                { name: 'Sarah Chen', email: 'sarah.chen@taskflow.office', status: 'online' },
                { name: 'Marcus Miller', email: 'marcus.miller@taskflow.office', status: 'online' },
                { name: 'Elena Rodriguez', email: 'elena.rodriguez@taskflow.office', status: 'away' },
                { name: 'David Park', email: 'david.park@taskflow.office', status: 'online' }
            ];
            await TeamMember.insertMany(initialMembers);
            console.log('🌱 Database Seeded Successfully');
        }

        // Seed initial Projects (Shipped)
        const projectCount = await Project.countDocuments();
        if (projectCount === 0) {
            const initialProjects = [
                { title: 'TaskFlow OS v1.0', category: 'Product', description: 'Our flagship productivity kernel launched globally.', team: 'Core Engine', impact: 'Disruptive', stats: { users: 12000, efficiency: '+40%' }, status: 'Shipped' },
                { title: 'Neon Design System', category: 'Internal Tool', description: 'High-performance UI framework for lightning-fast prototyping.', team: 'Visual Creators', impact: 'Growth', stats: { users: 450, efficiency: '+25%' }, status: 'Shipped' },
                { title: 'Service Pulse API', category: 'Strategic', description: 'Real-time analytics engine for customer success monitoring.', team: 'Support Heroes', impact: 'Steady', stats: { users: 80, efficiency: '+15%' }, status: 'Shipped' }
            ];
            await Project.insertMany(initialProjects);
            console.log('🚀 Projects Showcase Seeded Successfully');
        }

        // Seed Users
        // Check for Admin specifically
        const adminUser = await User.findOne({ username: 'Deva' });
        if (!adminUser) {
            console.log('⚠️ Admin user missing. Seeding Admin...');
            // Create an Employee record for the admin as well so they have a profile
            let adminEmployee = await Employee.findOne({ 'personal.email': 'admin@taskflow.office' });
            if (!adminEmployee) {
                adminEmployee = new Employee({
                    personal: {
                        firstName: 'Deva',
                        lastName: 'Admin',
                        email: 'admin@taskflow.office',
                        phone: '+1 000 000 000',
                        gender: 'Other'
                    },
                    profile: {
                        bio: 'Overseeing the entire TaskFlow ecosystem.',
                        performanceScore: 100
                    }
                });
                await adminEmployee.save();
            }

            const newAdmin = new User({ username: 'Deva', password: 'Deva123', role: 'admin', employeeId: adminEmployee._id });
            await newAdmin.save();
            console.log('👤 Admin User (Deva) Created Successfully');
        }

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            // If completely empty, we can add the default employee too
            const employee = await Employee.findOne({ 'personal.email': 'alex.rivera@taskflow.office' }); // Ensure Alex exists
            if (employee) {
                const newEmp = new User({ username: 'employee', password: 'emp123', role: 'employee', employeeId: employee._id });
                await newEmp.save();
                console.log('👤 Default Employee User Created Successfully');
            }
        }
    } catch (err) {
        console.error('❌ Seeding Error:', err);
    }
}

// Middleware for Role Checking
const checkRole = (roles) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'];

        console.log(`[AUTH] Access Attempt - User: ${username}, Role Provided: "${userRole}", Endpoint: ${req.method} ${req.url}`);

        if (!userRole) {
            console.warn(`[AUTH] Refused: No role header found.`);
            return res.status(401).json({ message: 'Unauthorized: No role provided' });
        }

        const authorized = roles.some(r => r.toLowerCase() === userRole.toLowerCase());

        if (!authorized) {
            console.warn(`[AUTH] Forbidden: Role "${userRole}" not in authorized list [${roles}]`);
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        console.log(`[AUTH] Authorized: ${username} (${userRole})`);
        next();
    };
};

// API Endpoints

// Login Endpoint
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;
    username = username ? username.trim() : '';
    password = password ? password.trim() : '';
    console.log(`[AUTH] Login attempt for: ${username}`);
    try {
        // Case-insensitive username lookup
        const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!user) {
            console.log(`[AUTH] Login failed: User '${username}' not found`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`[AUTH] Login failed: Password mismatch for '${username}'`);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        let department = null;
        let team = null;

        if (user.employeeId) {
            const employeeData = await Employee.findById(user.employeeId);
            if (employeeData) {
                department = employeeData.profile.department;
                team = employeeData.profile.team;
            } else {
                const teamMemberData = await TeamMember.findById(user.employeeId);
                if (teamMemberData) {
                    department = teamMemberData.department;
                    team = teamMemberData.teamName;
                }
            }
        }

        console.log(`[AUTH] Login successful: ${username} (${user.role}) | Dept: ${department} | Team: ${team}`);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                employeeId: user.employeeId,
                department: department,
                team: team
            }
        });
    } catch (err) {
        console.error(`[AUTH] Login Error:`, err);
        res.status(500).json({ message: err.message });
    }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create task
app.post('/api/tasks', checkRole(['employee']), async (req, res) => {
    const task = new Task({
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        team: req.body.team,
        status: req.body.status || 'todo',
        assignee: req.body.assignee,
        createdBy: req.headers['x-user-name'], // Save creator
        deadline: req.body.deadline
    });

    try {
        const newTask = await task.save();

        // Log activity
        const username = req.headers['x-user-name'] || 'employee';
        await Activity.create({
            activityType: 'task_created',
            employee: username,
            description: `Created task "${newTask.title}"`,
            relatedEntity: {
                entityType: 'task',
                entityId: newTask._id,
                entityName: newTask.title
            },
            metadata: { priority: newTask.priority, team: newTask.team }
        });

        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update task status
app.put('/api/tasks/:id', checkRole(['employee']), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const oldStatus = task.status;
        if (req.body.status) task.status = req.body.status;
        if (req.body.title) task.title = req.body.title;
        if (req.body.priority) task.priority = req.body.priority;
        if (req.body.team) task.team = req.body.team;
        if (req.body.description) task.description = req.body.description;

        const updatedTask = await task.save();

        // Log activity
        const username = req.headers['x-user-name'] || 'employee';
        if (req.body.status && oldStatus !== req.body.status) {
            const activityType = req.body.status === 'done' ? 'task_completed' : 'task_status_changed';
            await Activity.create({
                activityType,
                employee: username,
                description: `Changed task "${task.title}" status from ${oldStatus} to ${req.body.status}`,
                relatedEntity: {
                    entityType: 'task',
                    entityId: task._id,
                    entityName: task.title
                },
                metadata: { oldStatus, newStatus: req.body.status }
            });
        } else {
            await Activity.create({
                activityType: 'task_updated',
                employee: username,
                description: `Updated task "${task.title}"`,
                relatedEntity: {
                    entityType: 'task',
                    entityId: task._id,
                    entityName: task.title
                }
            });
        }

        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const taskTitle = task.title;
        await task.deleteOne();

        // Log activity
        const username = req.headers['x-user-name'] || 'employee';
        await Activity.create({
            activityType: 'task_deleted',
            employee: username,
            description: `Deleted task "${taskTitle}"`,
            metadata: { taskTitle }
        });

        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Team Member Endpoints
app.get('/api/team', async (req, res) => {
    try {
        const teamMembers = await TeamMember.find();
        const employees = await Employee.find();

        // Convert Employees to TeamMember-like structure for the frontend
        const employeeMembers = employees.map(emp => ({
            _id: emp._id,
            name: `${emp.personal.firstName} ${emp.personal.lastName}`,
            role: emp.profile.role,
            email: emp.personal.email,
            phone: emp.personal.phone,
            status: 'online', // Or track actual status
            department: emp.profile.department,
            teamName: emp.profile.team,
            performanceScore: emp.profile.performanceScore,
            joinedAt: emp.profile.joinedAt,
            isFullEmployee: true // Flag to distinguish if needed
        }));

        res.json([...teamMembers, ...employeeMembers]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Team Endpoints
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/teams', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        const teamData = req.body;
        teamData.createdBy = req.headers['x-user-name']; // Track creator

        const team = new Team(teamData);
        const newTeam = await team.save();

        // Log activity
        await Activity.create({
            activityType: 'team_created',
            employee: teamData.createdBy,
            description: `Created new team "${newTeam.name}"`,
            relatedEntity: {
                entityType: 'team',
                entityId: newTeam._id,
                entityName: newTeam.name
            }
        });

        res.status(201).json(newTeam);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// Project Showcase Endpoints
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ completionDate: -1 });
        res.json(projects);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/projects', checkRole(['admin', 'employee']), async (req, res) => {
    const project = new Project({
        ...req.body,
        addedBy: req.headers['x-user-name'] || 'System'
    });
    try {
        const newProject = await project.save();

        // Log activity
        await Activity.create({
            activityType: 'project_added',
            employee: req.headers['x-user-name'] || 'System',
            description: `Published project "${newProject.title}" to Showcase`,
            relatedEntity: {
                entityType: 'project',
                entityId: newProject._id,
                entityName: newProject.title
            },
            metadata: { category: newProject.category, team: newProject.team }
        });

        res.status(201).json(newProject);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

app.delete('/api/projects/:id', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Authorization: Admin or Creator only
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'];

        if (userRole !== 'admin' && (project.addedBy || '').toLowerCase() !== (username || '').toLowerCase()) {
            return res.status(403).json({ message: 'Unauthorized: You can only remove projects you showcased.' });
        }

        await project.deleteOne();
        res.json({ message: 'Project removed from showcase' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// Activity Endpoints
app.get('/api/activities', async (req, res) => {
    try {
        const { employee, startDate, endDate, activityType, limit = 50 } = req.query;
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'];

        let query = {};

        // Employees can only see their own activities, admins can see all
        if (userRole === 'employee') {
            query.employee = username || 'employee';
        } else if (employee && userRole === 'admin') {
            query.employee = employee;
        }

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        if (activityType) {
            query.activityType = activityType;
        }

        const activities = await Activity.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(activities);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/activities/daily', async (req, res) => {
    try {
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'] || 'employee';
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        let query = {
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        };

        // Employees can only see their own activities
        if (userRole === 'employee') {
            query.employee = username;
        }

        const activities = await Activity.find(query).sort({ timestamp: -1 });

        res.json(activities);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/activities/stats', async (req, res) => {
    try {
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'] || 'employee';
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
        const end = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

        let query = {
            timestamp: { $gte: start, $lte: end }
        };

        // Employees can only see their own stats
        if (userRole === 'employee') {
            query.employee = username;
        }

        const activities = await Activity.find(query);

        const stats = {
            totalActivities: activities.length,
            tasksCreated: activities.filter(a => a.activityType === 'task_created').length,
            tasksCompleted: activities.filter(a => a.activityType === 'task_completed').length,
            tasksUpdated: activities.filter(a => a.activityType === 'task_updated').length,
            projectsCreated: activities.filter(a => a.activityType === 'project_added').length,
            tasksInProgress: await Task.countDocuments({ status: 'in-progress' }),
            activityByType: {}
        };

        // Group by activity type
        activities.forEach(activity => {
            stats.activityByType[activity.activityType] =
                (stats.activityByType[activity.activityType] || 0) + 1;
        });

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User Management Endpoints (Admin)
app.get('/api/users', checkRole(['admin']), async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Team Member
app.delete('/api/team/:id', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        // Try deleting from TeamMember first
        let member = await TeamMember.findByIdAndDelete(req.params.id);
        let type = 'Team Member';

        // If not found in TeamMember, try Employee collection
        if (!member) {
            member = await Employee.findByIdAndDelete(req.params.id);
            type = 'Employee';
        }

        if (!member) return res.status(404).json({ message: 'Member not found in any directory' });

        // Also remove associated login if exists
        await User.findOneAndDelete({ employeeId: req.params.id });

        res.json({ message: `${type} deleted successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Team
app.delete('/api/teams/:id', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Authorization: Admin or Creator only
        const userRole = req.headers['x-user-role'];
        const username = req.headers['x-user-name'];

        if (userRole !== 'admin' && (team.createdBy || '').toLowerCase() !== (username || '').toLowerCase()) {
            // Check if user is a member of the team
            const members = await TeamMember.find({ teamName: team.name });
            console.log(`[DELETE TEAM] Checking auth for ${username}. Team Members: ${members.map(m => m.name).join(', ')}`);

            const isMember = members.some(m => {
                const mName = (m.name || '').toLowerCase();
                const mEmail = (m.email || '').toLowerCase();
                const uName = (username || '').toLowerCase();
                // Allow partial match: 'aru' matches 'Arumugam', or 'Arumugam' matches 'aru' (unlikely but safe)
                return mName.includes(uName) || uName.includes(mName) || mEmail.includes(uName) || mName === uName;
            });

            // Better: Check if there is a User with this username linked to a TeamMember in this team
            const userObj = await User.findOne({ username });
            let isVerifiedMember = false;
            if (userObj && userObj.employeeId) {
                const linkedMember = await TeamMember.findById(userObj.employeeId);
                if (linkedMember && linkedMember.teamName === team.name) {
                    isVerifiedMember = true;
                }
            }

            if (!isVerifiedMember && !isMember) {
                console.warn(`[DELETE TEAM] Refused. User ${username} is not a verified member/creator.`);
                return res.status(403).json({ message: 'Unauthorized: You can only delete teams you created or are a member of.' });
            }
        }

        await team.deleteOne();

        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/users', checkRole(['admin']), async (req, res) => {
    try {
        const { username, password, role, employeeId } = req.body;

        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Username already exists' });

        const newUser = new User({
            username,
            password,
            role,
            employeeId
        });

        await newUser.save();
        res.status(201).json({ message: 'User credentials created successfully', user: { username, role } });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Multer Configuration for File Uploads
const fs = require('fs');
const multer = require('multer');
const uploadDir = 'uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use timestamp + original name to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

// Upload Avatar Endpoint
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const username = req.headers['x-user-name'];
        if (!username) return res.status(401).json({ message: 'Unauthorized' });

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const avatarUrl = `/uploads/${req.file.filename}`;

        if (user.employeeId) {
            let employee = await Employee.findById(user.employeeId);
            if (employee) {
                employee.profile.avatar = avatarUrl;
                await employee.save();
            } else {
                let member = await TeamMember.findById(user.employeeId);
                if (member) {
                    member.avatar = avatarUrl;
                    await member.save();
                }
            }
        }

        res.json({ message: 'Avatar updated successfully', avatarUrl: avatarUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Create Activity Endpoint
app.post('/api/activities', async (req, res) => {
    try {
        const activity = new Activity(req.body);
        const newActivity = await activity.save();
        res.status(201).json(newActivity);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.post('/api/team', checkRole(['admin', 'employee']), async (req, res) => {
    try {
        const { username, password, ...memberData } = req.body;

        // 1. If credentials provided, check if username exists FIRST
        if (username) {
            const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
            if (existingUser) {
                return res.status(400).json({ message: `Username "${username}" is already taken.` });
            }
        }

        // 2. Create TeamMember
        const member = new TeamMember({
            ...memberData,
            addedBy: req.headers['x-user-name']
        });
        const newMember = await member.save();

        // 3. Create User account
        if (username && password) {
            const newUser = new User({
                username,
                password,
                role: 'employee',
                employeeId: newMember._id
            });
            await newUser.save();
        }

        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Employee Profile Endpoints
app.get('/api/employee/details/:id', checkRole(['admin']), async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/employee/me', async (req, res) => {
    try {
        const username = req.headers['x-user-name'];
        if (!username) return res.status(401).json({ message: 'Unauthorized' });

        const user = await User.findOne({ username });
        if (!user || !user.employeeId) return res.status(404).json({ message: 'User or Employee not found' });

        let employee = await Employee.findById(user.employeeId);

        // If not found in Employee, try TeamMember and mock the structure
        if (!employee) {
            const member = await TeamMember.findById(user.employeeId);
            if (member) {
                employee = {
                    _id: member._id,
                    isTeamMemberModel: true,
                    personal: {
                        firstName: member.name.split(' ')[0] || 'Member',
                        lastName: member.name.split(' ').slice(1).join(' ') || '',
                        email: member.email,
                        phone: member.phone || ''
                    },
                    profile: {
                        role: member.role,
                        department: member.department,
                        team: member.teamName,
                        joinedAt: member.joinedAt,
                        avatar: member.avatar
                    }
                };
            }
        }

        if (!employee) return res.status(404).json({ message: 'Profile not found' });
        res.json(employee);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/employee/me', async (req, res) => {
    try {
        const username = req.headers['x-user-name'];
        const user = await User.findOne({ username });
        if (!user || !user.employeeId) return res.status(404).json({ message: 'User or Employee ID not found' });

        let employee = await Employee.findById(user.employeeId);

        // If not found (user is a TeamMember), create an Employee record
        if (!employee) {
            const member = await TeamMember.findById(user.employeeId);
            if (!member) return res.status(404).json({ message: 'Base record not found' });

            console.log(`[UPGRADE] Migrating TeamMember ${member.name} to full Employee record.`);
            employee = new Employee({
                _id: member._id, // Keep same ID to maintain relationship
                personal: {
                    firstName: req.body.personal?.firstName || member.name.split(' ')[0],
                    lastName: req.body.personal?.lastName || member.name.split(' ').slice(1).join(' ') || '',
                    email: member.email,
                    phone: member.phone || ''
                },
                profile: {
                    role: member.role,
                    department: member.department,
                    team: member.teamName,
                    joinedAt: member.joinedAt,
                    avatar: member.avatar
                }
            });
        }

        if (req.body.personal) Object.assign(employee.personal, req.body.personal);
        if (req.body.profile) Object.assign(employee.profile, req.body.profile);
        if (req.body.addresses) employee.addresses = req.body.addresses;
        if (req.body.education) employee.education = req.body.education;
        if (req.body.skills) employee.skills = req.body.skills;

        const updated = await employee.save();
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// Serve frontend for any other routes
/*
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
*/

app.listen(PORT, () => {
    console.log('=========================================');
    console.log('🚀 SERVER UPDATED & RUNNING ON PORT ' + PORT);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log('✅ AUTH: Case-Insensitive Roles Enabled');
    console.log('✅ AUTH: [' + ['admin', 'employee'] + '] allowed for Deletion');
    console.log('=========================================');
});

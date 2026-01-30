const state = {
    tasks: [],
    team: [],
    teams: [],
    projects: [],
    user: null,
    filters: {
        category: 'all',
        search: '',
        team: 'all'
    },
    users: [] // NEW: Store users list for admin
};

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api';

function checkAuth() {
    const userJson = sessionStorage.getItem('user');
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!userJson && !isLoginPage) {
        window.location.href = 'login.html';
        return null;
    }
    return userJson ? JSON.parse(userJson) : null;
}

// Immediate check
checkAuth();

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
}

function getAuthHeaders() {
    const user = checkAuth();
    const headers = {
        'Content-Type': 'application/json',
        'x-user-role': user ? user.role : '',
        'x-user-name': user ? user.username : ''
    };
    console.log('[AUTH] Sending Headers:', headers);
    return headers;
}
const DEPARTMENTS = ['Designing', 'Development', 'Marketing', 'Service', 'Executive', 'Operations', 'General', 'Testing'];

// Detect Current Page
const currentPage = document.currentScript.getAttribute('data-page') || 'profile';

// DOM Elements
const modalContainer = document.getElementById('modal-container');

// Initialization
async function init() {
    try {
        const user = checkAuth();
        if (!user) return;
        state.user = user;

        await Promise.all([
            fetchEmployee(),
            fetchTasks(),
            fetchTeam(),
            fetchTeamsHierarchy(),
            fetchProjects()
        ]);

        // Sync user state with profile for dynamic updates
        if (state.user_profile && state.user.role !== 'admin') {
            state.user.department = state.user_profile.profile.department;
            state.user.team = state.user_profile.profile.team;
        }

        // Admin only fetches
        if (state.user.role === 'admin') {
            await fetchUsers();
        }

        switch (currentPage) {
            case 'profile': renderProfile(); break;
            case 'team': renderTeam(); break;
            case 'tasks': renderTasks(); break;
            case 'testing-queue': renderTestingQueue(); break;
            case 'timeline': renderTimeline(); break;
            case 'showcase': renderShowcase(); break;
            case 'reporting': renderReporting(); break;
            case 'employee_details': renderEmployeeDetails(); break;
        }

        // Show Admin Nav Item if Admin logic
        if (state.user.role === 'admin') {
            const adminNav = document.getElementById('admin-nav-item');
            if (adminNav) adminNav.style.display = 'flex';
        }

        // Set Active Nav Step
        setActiveNav();

        // Restricted Navigation for Testing Team or Testing Operation/Department
        const isTestingDept = state.user.department && state.user.department.trim().toLowerCase() === 'testing';
        const isTestingTeam = state.user.team && state.user.team.trim().toLowerCase() === 'testing team';

        if (isTestingDept || isTestingTeam) {
            const steps = document.querySelectorAll('.steps .step');
            steps.forEach(step => {
                const text = step.textContent.toLowerCase();
                const isProfile = text.includes('profile');
                // Allow "Testing Queue" or similar if we decide to add it to nav, or just leave it for the button
                const isLogout = text.includes('logout') || step.id === 'logout-btn';

                if (!isProfile && !isLogout) {
                    step.style.display = 'none';
                }
            });
        }

        // Hide Testing Dashboard button on Task Board for non-testers (Admin approves on main board)
        const testingBtn = document.getElementById('testing-dashboard-btn');
        if (testingBtn) {
            const isTester = state.user.team && state.user.team.trim().toLowerCase() === 'testing team';
            if (!isTester) {
                testingBtn.style.display = 'none';
            }
        }

        setupGlobalEvents();
    } catch (err) {
        console.error('Initialization Failed:', err);
        const container = document.getElementById('profile-display') || document.body;
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <i class="fa-solid fa-triangle-exclamation fa-3x"></i>
                <h3 style="margin-top: 15px;">Dashboard Load Error</h3>
                <p>${err.message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin: 20px auto;">Retry Load</button>
            </div>
        `;
    }
}

// ... existing fetch functions ...

function renderEmployeeDetails() {
    const container = document.getElementById('employee-list-container');
    if (!container) return;

    // Setup Filters
    const searchInput = document.getElementById('emp-search');
    const deptFilter = document.getElementById('emp-dept-filter');

    if (deptFilter) deptFilter.style.display = 'none';

    const filterEmployees = () => {
        const query = searchInput.value.toLowerCase();

        // Deduplicate members by email
        const uniqueMembers = Array.from(new Map(state.team.map(item => [item.email, item])).values());

        // Use uniqueMembers for filtering
        const filtered = uniqueMembers.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query);

            // Check if this employee has an associated login to identify roles
            const userAccount = state.users && state.users.find(u => u.employeeId === (emp._id || emp.id));
            const isAdmin = userAccount && userAccount.role === 'admin';

            // Show all employees/members matching search, excluding the super admin if desired
            // But usually, Admin wants to see every profile they created
            return matchesSearch;
        });

        renderList(filtered);
    };

    if (searchInput) searchInput.onkeyup = filterEmployees;

    const renderList = (employees) => {
        if (employees.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1/-1;">
                    <p>No employees found matching your criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = employees.map(emp => {
            const hasLogin = state.users && state.users.find(u => u.employeeId === (emp._id || emp.id));
            const isAdmin = hasLogin && hasLogin.role === 'admin';

            return `
                <div class="profile-card-mini" style="height: auto; align-items: flex-start; gap: 15px; cursor: pointer; position: relative;" onclick="showEmployeeFullDetails('${emp._id || emp.id}')">
                    ${hasLogin ? `
                        <div style="position: absolute; top: 15px; right: 15px; color: ${isAdmin ? '#8b5cf6' : '#10b981'}; font-size: 0.8rem; background: ${isAdmin ? '#f5f3ff' : '#ecfdf5'}; padding: 4px 8px; border-radius: 6px; display: flex; align-items: center; gap: 5px; border: 1px solid currentColor;">
                            <i class="fa-solid fa-shield-check"></i> 
                            <span>${isAdmin ? 'ADMIN' : 'IDENTIFIED'}</span>
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 15px; width: 100%; align-items: center;">
                        <div class="avatar-sm" style="width: 50px; height: 50px; font-size: 1.2rem; border-radius: 50%; border: 2px solid ${emp.status === 'online' ? '#10b981' : '#cbd5e1'};">
                            <img src="${emp.avatar || 'avatar.png'}" onerror="this.src='avatar.png'" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                        </div>
                        <div>
                            <h5 style="margin: 0; font-size: 0.95rem; color: var(--text-main); font-weight: 700;">${emp.name}</h5>
                            <p style="font-size: 0.75rem; color: var(--primary); margin: 0;">${emp.role}</p>
                        </div>
                    </div>
                    
                    <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 10px; display: grid; grid-template-columns: 1fr; gap: 10px;">
                        <div>
                            <h6 style="color: var(--text-muted); font-size: 0.65rem; text-transform: uppercase;">Employee Email</h6>
                            <span style="font-size: 0.8rem; font-weight: 600;">${emp.email}</span>
                        </div>
                    </div>
                    
                    <div style="width: 100%; font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fa-solid fa-envelope"></i> ${emp.email}</span>
                        ${hasLogin ? `<span style="font-size: 0.6rem; opacity: 0.6;">UID: ${hasLogin.username}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    };

    // Initial Render
    filterEmployees();
}

async function showEmployeeFullDetails(id) {
    // 1. Find basic info from state
    let member = state.team.find(m => (m._id || m.id) === id);
    if (!member) return;

    // 2. Fetch full details if Admin and isFullEmployee
    if (state.user.role === 'admin' && member.isFullEmployee) {
        try {
            const res = await fetch(`${API_BASE}/employee/details/${id}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const fullData = await res.json();
                // Merge data for display
                member = {
                    ...member,
                    ...fullData,
                    personal: fullData.personal || { email: member.email, phone: member.phone },
                    addresses: fullData.addresses || [],
                    education: fullData.education || []
                };
            }
        } catch (e) { console.error('Failed to fetch full details', e); }
    }

    // 3. Fetch Projects/Teams created by this member
    // Note: state.teams contains all teams hierarchy
    const createdTeams = state.teams.filter(t =>
        (t.createdBy || '').toLowerCase() === (member.username || member.name || '').toLowerCase() ||
        (t.name || '').toLowerCase() === (member.teamName || '').toLowerCase() // Fallback to assigned team if any
    );

    // Also look for explicit tasks or project items if needed, but for now we focus on "Created Teams/Projects"
    // Since 'Teams' essentially represent projects in this app structure (Team + Project Name).

    const renderSection = (title, content) => `
        <div style="margin-bottom: 20px;">
            <h4 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 5px; margin-bottom: 10px;">${title}</h4>
            ${content}
        </div>
    `;

    const addressesHtml = (member.addresses && member.addresses.length > 0) ? member.addresses.map(addr => `
        <div style="font-size: 0.8rem; margin-bottom: 8px;">
            <strong>${addr.type.toUpperCase()}:</strong> ${addr.street || ''}, ${addr.city}, ${addr.state}
        </div>
    `).join('') : '<span style="color: grey; font-size: 0.8rem;">No Info</span>';

    const eduHtml = (member.education && member.education.length > 0) ? member.education.map(edu => `
        <div style="font-size: 0.8rem; margin-bottom: 8px;">
            <strong>${edu.level.toUpperCase()}:</strong> ${edu.degree} @ ${edu.institution}
        </div>
    `).join('') : '<span style="color: grey; font-size: 0.8rem;">No Info</span>';

    // Find assigned team object to get project name
    const assignedTeamObj = state.teams.find(t => (t.name || '').toLowerCase() === (member.teamName || '').toLowerCase());
    const matchedProjectName = assignedTeamObj ? assignedTeamObj.projectName : 'Unassigned';

    modalContainer.innerHTML = `
        <div class="modal-content card" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <h2 style="font-weight: 800;">Employee Profile</h2>
                <button id="close-modal-btn" class="btn-icon"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                <!-- Avatar Side -->
                <div style="flex: 0 0 200px; text-align: center;">
                    <div class="profile-img-container" style="width: 120px; height: 120px;">
                         <img src="${member.avatar || 'avatar.png'}" class="profile-img" onerror="this.src='avatar.png'">
                    </div>
                    <h3 style="margin-top: 10px;">${member.name}</h3>
                    <p style="color: var(--primary); font-weight: 600;">${member.role}</p>
                    <div class="status-badge" style="margin-top: 10px; display: inline-block; background: ${member.status === 'online' ? '#d1fae5' : '#f1f5f9'}; color: ${member.status === 'online' ? '#065f46' : '#64748b'};">
                        ${(member.status || 'OFFLINE').toUpperCase()}
                    </div>
                </div>
                
                <!-- Details Side -->
                <div style="flex: 1; min-width: 300px;">
    
                    ${renderSection('Professional', `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Joined At</label>
                                <div style="font-weight: 600;">${new Date(member.joinedAt).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Current Project</label>
                                <div style="font-weight: 600; color: var(--primary);">${matchedProjectName}</div>
                            </div>
                            <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Performance</label>
                                <div style="font-weight: 600;">${member.performanceScore || 'N/A'}</div>
                            </div>
                        </div>
                    `)}

                    ${renderSection('Contact', `
                        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                             <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Email</label>
                                <div style="font-weight: 600;">${member.email || member.personal?.email}</div>
                            </div>
                            <div>
                                <label style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Phone</label>
                                <div style="font-weight: 600;">${member.phone || member.personal?.phone || 'N/A'}</div>
                            </div>
                        </div>
                    `)}

                    ${renderSection('Address Book', addressesHtml)}
                    
                    ${renderSection('Education & Skills', eduHtml)}

                    ${renderSection('Project Leadership', createdTeams.length > 0 ? createdTeams.map(t => `
                        <div style="font-size: 0.8rem; margin-bottom: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                            <div style="font-weight: 700; color: var(--text-main);">${t.projectName || t.name}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${t.department} • ${t.description || 'No description'}</div>
                            ${t.deadline ? `<div style="font-size: 0.65rem; color: var(--accent); margin-top: 4px;"><i class="fa-solid fa-flag"></i> Target: ${new Date(t.deadline).toLocaleDateString()}</div>` : ''}
                        </div>
                    `).join('') : '<span style="color: grey; font-size: 0.8rem;">No active project leadership found.</span>')}

                </div>
            </div>
        </div>
    `;
    modalContainer.style.display = 'flex';
}

async function showEditProfileModal() {
    if (!state.user_profile) return;
    const p = state.user_profile;

    modalContainer.innerHTML = `
        <div class="modal-content card" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 25px;">
                <h2 style="font-weight: 800;">Update Personal Profile</h2>
                <i class="fa-solid fa-user-pen fa-2x" style="opacity: 0.1;"></i>
            </div>
            <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px;">FIRST NAME</label>
                        <input type="text" id="ep-fname" value="${p.personal.firstName}" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                    </div>
                    <div>
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px;">LAST NAME</label>
                        <input type="text" id="ep-lname" value="${p.personal.lastName}" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px;">PHONE NUMBER</label>
                        <input type="tel" id="ep-phone" value="${p.personal.phone || ''}" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                    </div>
                </div>



                <div>
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px;">NATIONALITY</label>
                    <input type="text" id="ep-nation" value="${p.personal.nationality || ''}" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                </div>

                <textarea id="ep-bio" class="form-control">${p.profile.bio || ''}</textarea>

                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" id="save-profile-btn" class="btn-primary" style="flex: 1;">Save Changes</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;

    modalContainer.style.display = 'flex';

    document.getElementById('edit-profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        const data = {
            personal: {
                firstName: document.getElementById('ep-fname').value,
                lastName: document.getElementById('ep-lname').value,
                phone: document.getElementById('ep-phone').value,
                nationality: document.getElementById('ep-nation').value
            },
            profile: {
                bio: document.getElementById('ep-bio').value
            }
        };

        try {
            const res = await fetch(`${API_BASE}/employee/me`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Failed to update profile');

            await fetchEmployee();
            renderProfile();
            modalContainer.style.display = 'none';
            alert('Profile updated successfully!');
        } catch (err) {
            alert(err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Changes';
        }
    };
}

async function fetchEmployee() {
    try {
        const res = await fetch(`${API_BASE}/employee/me`, { headers: getAuthHeaders() });
        const data = await res.json();
        // If it's an admin, they might not have an employee record, use storage info
        state.user_profile = data.message ? null : data;
    } catch (err) { console.error('Failed to fetch employee:', err); }
}

async function fetchTasks() {
    try {
        const res = await fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders(), cache: 'no-store' });
        state.tasks = await res.json();
    } catch (err) { console.error('Failed to fetch tasks:', err); }
}

async function fetchTeam() {
    try {
        const res = await fetch(`${API_BASE}/team`, { headers: getAuthHeaders() });
        state.team = await res.json();
    } catch (err) { console.error('Failed to fetch team members:', err); }
}

async function fetchTeamsHierarchy() {
    try {
        const res = await fetch(`${API_BASE}/teams`, { headers: getAuthHeaders() });
        state.teams = await res.json();
    } catch (err) { console.error('Failed to fetch teams:', err); }
}

async function fetchProjects() {
    try {
        const res = await fetch(`${API_BASE}/projects`, { headers: getAuthHeaders() });
        state.projects = await res.json();
    } catch (err) { console.error('Failed to fetch projects:', err); }
}

async function fetchUsers() {
    try {
        const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
        if (res.ok) state.users = await res.json();
    } catch (err) { console.error('Failed to fetch users:', err); }
}

// RENDERERS
function renderProfile() {
    const container = document.getElementById('profile-display');
    if (!container) return;

    const isTester = (state.user.team && state.user.team.trim().toLowerCase() === 'testing team') ||
        (state.user.department && state.user.department.trim().toLowerCase() === 'testing');

    // Update Page Header if current page is profile
    const greeting = document.getElementById('user-greeting');
    const headerPara = document.querySelector('.header-text p');
    if (greeting) {
        greeting.innerText = isTester ? "Testing Operations Control" : "Institutional Profile";
        if (headerPara) headerPara.innerText = isTester ? "Quality assurance and deployment verification systems." : "Core identity and professional metrics dashboard.";
    }

    if (!state.user_profile) {
        if (state.user.role === 'admin') {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fa-solid fa-user-shield fa-3x" style="opacity: 0.1; margin-bottom: 20px;"></i>
                    <p>Admin profile data not found. Please ensure seed data is loaded.</p>
                </div>
            `;
        }
        return;
    }

    const profile = state.user_profile;
    const avatarPath = profile.profile.avatar || 'avatar.png';

    // Helper to render Avatar HTML
    const renderAvatar = (imgSrc) => `
        <div style="grid-column: 1 / -1; margin-bottom: 40px;">
            <div class="profile-header-professional" style="background: ${isTester ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.05), transparent)' : 'rgba(255,255,255,0.02)'}; border-radius: var(--radius-md); border: 1px solid ${isTester ? '#ec489930' : 'var(--border-color)'}; padding: 30px; position: relative; overflow: hidden;">
                ${isTester ? '<div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, #ec489910 0%, transparent 70%); border-radius: 50%;"></div>' : ''}
                <div class="profile-img-container" onclick="triggerAvatarUpload()" style="width: 80px; height: 80px; flex-shrink: 0; border-color: ${isTester ? '#ec4899' : 'var(--primary)'};">
                    <img src="${imgSrc || 'avatar.png'}" class="profile-img" id="current-avatar" onerror="this.src='avatar.png'">
                    <div class="edit-overlay">
                        <i class="fa-solid fa-camera"></i>
                    </div>
                    <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="uploadAvatar(this)">
                </div>
                <div style="flex: 1; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                        <h2 style="font-size: 1.8rem; color: var(--text-main); font-family: var(--font-heading); margin: 0;">${profile.personal.firstName} ${profile.personal.lastName}</h2>
                        <span style="background: ${isTester ? '#ec489915' : 'var(--primary-dim)'}; color: ${isTester ? '#ec4899' : 'var(--primary)'}; font-size: 0.65rem; padding: 4px 10px; border-radius: 20px; font-family: var(--font-mono); font-weight: 700; border: 1px solid ${isTester ? '#ec489930' : 'rgba(14, 165, 233, 0.2)'};">${isTester ? 'QUALITY ASSURANCE' : 'EMPLOYEE ACCOUNT'}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid ${isTester ? 'fa-microscope' : 'fa-briefcase'}" style="color: ${isTester ? '#ec4899' : 'var(--primary)'}; font-size: 0.8rem;"></i>
                        ${profile.profile.role || 'Personnel'}
                    </p>
                </div>
                <div style="display: flex; gap: 15px; z-index: 1;">
                    ${state.user.role === 'admin' ? '' : ''}
                    ${isTester ? `
                        <button onclick="window.location.href='testing-queue.html'" class="btn-primary" style="padding: 10px 20px; font-size: 0.8rem; background: #ec4899; color: white; border-color: #ec4899; box-shadow: 0 4px 15px #ec489940;">
                            <i class="fa-solid fa-rocket"></i> ENTER TESTING QUEUE
                        </button>
                    ` : ''}
                    <button onclick="showEditProfileModal()" class="btn-outline" style="padding: 10px 20px; font-size: 0.8rem; border-color: ${isTester ? '#ec489940' : 'var(--text-muted)'};">
                        <i class="fa-solid fa-sliders"></i> System Settings
                    </button>
                </div>
            </div>
        </div>
    `;

    if (isTester) {
        const testingTasksCount = state.tasks.filter(t => t.status === 'testing').length;
        const autoVerifiedCount = state.projects.filter(p => (p.team || '').toLowerCase().includes('testing')).length;

        container.innerHTML = `
            ${renderAvatar(avatarPath)}
            
            <div class="profile-card-mini" style="border-left: 4px solid #ec4899; background: linear-gradient(to bottom right, #fff, #ec489905);">
                <i class="fa-solid fa-vial" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2.5rem; color: #ec4899;"></i>
                <h5 style="color: #ec4899;">Active Testing Queue</h5>
                <p style="font-size: 2.2rem; font-weight: 800; color: #ec4899;">${testingTasksCount}</p>
                <span style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Tasks awaiting verification</span>
            </div>

            <div class="profile-card-mini" style="border-left: 4px solid #10b981;">
                <i class="fa-solid fa-shield-check" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2.5rem; color: #10b981;"></i>
                <h5 style="color: #10b981;">Deployment Readiness</h5>
                <p style="font-size: 2.2rem; font-weight: 800; color: #10b981;">100%</p>
                <span style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Current system stability</span>
            </div>

            <div class="profile-card-mini" style="grid-column: 1 / -1; min-height: 120px; background: #0a0f1a; border: 1px solid #ffffff10;">
                <i class="fa-solid fa-terminal" style="position: absolute; right: 20px; top: 20px; opacity: 0.2; font-size: 2rem; color: #ec4899;"></i>
                <h5 style="color: #ec4899; opacity: 0.8;">Technical Directive</h5>
                <p style="font-size: 1rem; font-weight: 400; line-height: 1.6; color: rgba(255,255,255,0.7); font-family: var(--font-mono);">${profile.profile.bio || 'Executing high-fidelity quality assurance protocols and system-wide deployment verifications.'}</p>
            </div>

            <div class="profile-card-mini">
                <i class="fa-solid fa-microscope" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Operation Sector</h5>
                <p>${profile.profile.department || 'Quality Assurance'}</p>
            </div>

            <div class="profile-card-mini">
                <i class="fa-solid fa-fingerprint" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>System clearance</h5>
                <p>Level 4 Associate</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            ${renderAvatar(avatarPath)}
            
            <div class="profile-card-mini" style="animation-delay: 0.1s">
                <i class="fa-solid fa-envelope-open-text" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Official Correspondence</h5>
                <p>${profile.personal.email}</p>
            </div>
            <div class="profile-card-mini" style="animation-delay: 0.2s">
                <i class="fa-solid fa-briefcase" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Institutional Role</h5>
                <p>${profile.profile.role || 'Senior Associate'}</p>
            </div>
            <div class="profile-card-mini" style="grid-column: 1 / -1; min-height: 120px; animation-delay: 0.4s">
                <i class="fa-solid fa-quote-left" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Professional Narrative</h5>
                <p style="font-size: 1rem; font-weight: 400; line-height: 1.6; color: var(--text-muted);">${profile.profile.bio || 'Architecting the future of task management and organizational efficiency.'}</p>
            </div>

            <div class="profile-card-mini" style="animation-delay: 0.5s">
                <i class="fa-solid fa-calendar-check" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Onboarding Date</h5>
                <p>${new Date(profile.profile.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="profile-card-mini" style="animation-delay: 0.6s">
                <i class="fa-solid fa-bolt" style="position: absolute; right: 20px; top: 20px; opacity: 0.1; font-size: 2rem;"></i>
                <h5>Performance Index</h5>
                <p>${profile.profile.performanceScore || 95}%</p>
            </div>
        `;
    }
}

function triggerAvatarUpload() {
    document.getElementById('avatar-upload').click();
}

async function uploadAvatar(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const res = await fetch(`${API_BASE}/upload-avatar`, {
            method: 'POST',
            headers: {
                'x-user-name': state.user.username,
                'x-user-role': state.user.role
                // Note: Do NOT set Content-Type header manually when using FormData, 
                // browser sets it with boundary automatically.
            },
            body: formData
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message);

        // Update UI
        document.getElementById('current-avatar').src = result.avatarUrl;

        // Update local state
        if (state.user_profile && state.user_profile.profile) {
            state.user_profile.profile.avatar = result.avatarUrl;
        }

        alert('Profile picture updated!');
    } catch (err) {
        alert('Failed to upload image: ' + err.message);
    }
}

function renderTeam() {
    const container = document.getElementById('team-container');
    if (!container) return;

    // Filter teams based on who created them
    const visibleTeams = state.teams.filter(t => {
        if (state.user.role === 'admin') {
            return t.createdBy;
        } else {
            const isCreator = (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
            const isAssigned = (state.user.team || '').trim().toLowerCase() === (t.name || '').trim().toLowerCase();

            // Check if the user is a member or added someone to this team
            const hasActivity = state.team.some(m =>
                (m.teamName || '').trim().toLowerCase() === t.name.trim().toLowerCase() &&
                ((m.username && m.username.toLowerCase() === state.user.username.toLowerCase()) ||
                    (m.name && m.name.toLowerCase() === state.user.username.toLowerCase()) ||
                    (m.addedBy && m.addedBy.toLowerCase() === state.user.username.toLowerCase()))
            );

            return isCreator || isAssigned || hasActivity;
        }
    }).filter(team => {
        // Filter out teams where ALL tasks are completed
        const teamTasks = state.tasks.filter(t => (t.team || '').trim().toLowerCase() === team.name.trim().toLowerCase());

        // Check if all tasks are done (case insensitive)
        const isProjectComplete = teamTasks.length > 0 && teamTasks.every(t => (t.status || '').toLowerCase() === 'done');

        console.log(`[Team Filter] Team: ${team.name}, Tasks: ${teamTasks.length}, All Done: ${isProjectComplete}`);

        return !isProjectComplete;
    });

    if (visibleTeams.length === 0) {
        container.innerHTML = `
            <div class="profile-card-mini" style="text-align: center; padding: 60px; color: var(--text-muted);">
                <i class="fa-solid fa-people-group fa-3x" style="opacity: 0.1; margin-bottom: 20px;"></i>
                <p>No active teams detected in your professional workspace.</p>
            </div>`;
        return;
    }

    const isTester = (state.user.team && state.user.team.trim().toLowerCase() === 'testing team') ||
        (state.user.department && state.user.department.trim().toLowerCase() === 'testing');

    if (isTester) {
        alert("SECURITY NOTICE: Team member identities are restricted for Testing Operations. You only have access to project-level directives.");
    }

    container.innerHTML = visibleTeams.map((team, idx) => {
        const members = state.team.filter(m => {
            const matchesTeam = m.teamName && m.teamName.trim().toLowerCase() === team.name.trim().toLowerCase();
            return matchesTeam;
        });

        // Check if all tasks for this team are completed
        const teamTasks = state.tasks.filter(t => (t.team || '').trim().toLowerCase() === team.name.trim().toLowerCase());
        const isProjectComplete = teamTasks.length > 0 && teamTasks.every(t => t.status === 'done');

        const isCreator = (team.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();

        return `
            <div class="department-section" style="animation: fadeInUp 0.5s ease-out ${idx * 0.1}s forwards; border: 1px solid var(--border-color); background: var(--bg-surface); margin-bottom: 40px; padding: 35px; border-radius: var(--radius-lg); position: relative; box-shadow: var(--shadow-premium);">
                ${isProjectComplete ? `
                    <div style="position: absolute; top: -12px; left: 35px; background: var(--accent); color: white; padding: 6px 18px; border-radius: 30px; font-size: 0.75rem; font-weight: 900; font-family: var(--font-mono); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); z-index: 10; letter-spacing: 1px;">
                        <i class="fa-solid fa-circle-check"></i> DEPLOYMENT SUCCESS
                    </div>
                ` : ''}
                
                <div class="team-info" style="position: relative; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 18px;">
                            <h3 style="margin: 0; font-size: 2rem; color: var(--text-main); font-weight: 800; font-family: var(--font-heading); letter-spacing: -1px;">${(team.name || '').toUpperCase()}</h3>
                            <span class="status-badge" style="background: rgba(14, 165, 233, 0.1); color: var(--primary); border: 1px solid rgba(14, 165, 233, 0.2); font-size: 0.65rem; font-weight: 800; padding: 4px 12px; border-radius: 8px;">${(team.department || 'OPERATIONS').toUpperCase()}</span>
                             <button onclick="deleteTeam('${team._id}')" class="btn-icon" style="margin-left: 10px; width: 28px; height: 28px; color: #ef4444; background: transparent; border: 1px solid #ef4444; border-radius: 6px; opacity: 0.6; transition: 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="Delete Directory">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 30px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #10b981; font-weight: 800; font-family: var(--font-mono);">
                                <i class="fa-solid fa-sitemap" style="font-size: 1.1rem;"></i>
                                <span>PROJECT: ${(team.projectName || 'Internal').toUpperCase()}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--text-dim); font-weight: 600;">
                                <i class="fa-solid fa-user-tie" style="opacity: 0.7;"></i>
                                <span style="letter-spacing: 0.5px;">OWNER: <strong style="color: var(--text-main); font-weight: 800;">${isTester ? 'RESTRICTED' : team.createdBy}</strong></span>
                            </div>
                        </div>
                        <p style="margin-top: 5px; font-size: 0.95rem; color: var(--text-muted); line-height: 1.7; max-width: 900px; font-weight: 450;">
                            ${team.description || 'Enterprise collaboration unit dedicated to project excellence and professional delivery.'}
                        </p>
                    </div>
                </div>

                <div style="background: #f8fafc; border-radius: var(--radius-lg); padding: 30px; border: 1px solid #eef2f6; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
                        <h5 style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; font-weight: 800; margin: 0;">TEAM COMPOSITION</h5>
                        ${(state.user.role === 'admin' || isCreator) ? `
                            <button onclick="showTeamModal('${team.name}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.7rem;">
                                <i class="fa-solid fa-user-plus"></i> Add Member
                            </button>
                        ` : ''}
                    </div>
                    <div class="team-card-grid" style="display: flex; flex-direction: column; gap: 12px;">
                        ${isTester ? `
                            <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #ec489950; color: #ec4899;">
                                <i class="fa-solid fa-user-shield fa-3x" style="margin-bottom: 15px; opacity: 0.3;"></i>
                                <h4 style="font-weight: 700; margin-bottom: 5px;">INFORMATION RESTRICTED</h4>
                                <p style="font-size: 0.85rem; opacity: 0.8;">Team member identities are encrypted for security operations.</p>
                            </div>
                        ` : (members.length > 0 ? members.map(member => {
            const userAccount = state.users.find(u => u.employeeId === (member._id || member.id));
            const hasAccess = !!userAccount;
            const isOnline = member.status === 'online';

            return `
                            <div class="team-member-row" style="background: white; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 20px; transition: all 0.2s; position: relative; cursor: pointer; height: 80px;" onclick="showEmployeeFullDetails('${member._id || member.id}')">
                                <div style="width: 50px; height: 50px; border: 2px solid ${isOnline ? '#10b981' : '#cbd5e1'}; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; flex-shrink: 0; position: relative;">
                                    <i class="fa-solid fa-user" style="color: #64748b; font-size: 1.2rem;"></i>
                                    ${isOnline ? `<div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></div>` : ''}
                                </div>

                                <div style="flex: 1;">
                                    <h4 style="margin: 0; font-size: 1rem; color: var(--text-main); font-weight: 800; letter-spacing: -0.2px;">${member.name}</h4>
                                    <p style="margin: 3px 0 0 0; font-size: 0.75rem; color: #3b82f6; font-weight: 700; text-transform: lowercase;">${member.role || 'Contributor'}</p>
                                </div>

                                ${(!hasAccess && state.user.role === 'admin') ? `
                                    <button onclick="event.stopPropagation(); showCreateUserModal('${member._id || member.id}', '${member.name}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.65rem; background: var(--warning); color: white; border: none; height: 32px; border-radius: 6px;" title="Create Access">
                                        <i class="fa-solid fa-lock-open"></i> PENDING ACCESS
                                    </button>
                                ` : ''}

                                <button onclick="event.stopPropagation(); deleteMember('${member._id || member.id}')" class="btn-icon" style="width: 28px; height: 28px; font-size: 0.8rem; color: #ef4444; background: transparent; border: none; opacity: 0.6; transition: 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        `;
        }).join('') : `
                            <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                                <i class="fa-solid fa-user-plus fa-2x" style="color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                                <p style="font-size: 0.85rem; color: #94a3b8; font-weight: 500;">No members active in this unit yet.</p>
                            </div>
                        `)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteMember(id) {
    if (!confirm('Are you sure you want to remove this member? This action cannot be undone.')) return;
    try {
        const res = await fetch(`${API_BASE}/team/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            const errText = await res.text();
            let errMsg = 'Could not delete member from server.';
            try { errMsg = JSON.parse(errText).message || errMsg; } catch (e) { }
            throw new Error(`${errMsg} (${res.status})`);
        }

        await Promise.all([
            fetchTeam(),
            fetchTasks(),
            state.user.role === 'admin' ? fetchUsers() : Promise.resolve()
        ]);

        renderTeam();
        renderProfile();
        if (currentPage === 'tasks') renderTasks();

        alert('Member removed successfully.');
    } catch (err) {
        alert('Deletion Failed: ' + err.message);
    }
}

async function deleteTeam(id) {
    if (!confirm('Are you sure you want to permanently delete this team and all its data?')) return;
    try {
        const res = await fetch(`${API_BASE}/teams/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `Server Error (${res.status})`);
        }

        await fetchTeamsHierarchy();
        renderTeam();
        alert('Team deleted successfully.');
    } catch (err) {
        alert('Deletion Failed: ' + err.message);
    }
}

function renderTasks() {
    const columns = {
        'todo': document.getElementById('list-todo'),
        'in-progress': document.getElementById('list-progress'),
        'testing': document.getElementById('list-testing'),
        'done': document.getElementById('list-done')
    };
    if (!columns.todo) return;
    renderTaskContext();

    Object.values(columns).forEach(list => list.innerHTML = '');

    // Check completion status for each team
    const teamCompletion = {};
    state.teams.forEach(t => {
        const tName = (t.name || '').trim().toLowerCase();
        const teamTasks = state.tasks.filter(tk => (tk.team || '').trim().toLowerCase() === tName);
        teamCompletion[tName] = teamTasks.length > 0 && teamTasks.every(tk => tk.status === 'done');
    });

    state.tasks.forEach(task => {
        const taskTeam = (task.team || '').trim().toLowerCase();

        // If the entire team project is complete, remove it from the task board display
        if (teamCompletion[taskTeam]) return;

        // Visibility Logic
        let isVisible = false;
        if (state.user.role === 'admin') {
            isVisible = true;
        } else {
            // Employee: Visible if it's their Assigned Team OR a Team they Created OR a Task they Created
            const isAssigned = state.user.team && taskTeam.toLowerCase() === (state.user.team || '').toLowerCase();
            const isTeamCreator = state.teams.some(t => {
                const matchesTeam = t.name.toLowerCase() === taskTeam.toLowerCase();
                const matchesCreator = (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
                return matchesTeam && matchesCreator;
            });
            // Also check if they created the task directly
            const isTaskCreator = (task.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();

            const isMember = state.team.some(m =>
                (m.teamName || '').trim().toLowerCase() === taskTeam.toLowerCase() &&
                ((m.username && m.username.toLowerCase() === state.user.username.toLowerCase()) ||
                    (m.name && m.name.toLowerCase() === state.user.username.toLowerCase()))
            );

            isVisible = isAssigned || isTeamCreator || isTaskCreator || isMember;
        }

        if (!isVisible) return;
        if (state.filters.team !== 'all' && taskTeam.toLowerCase() !== state.filters.team.toLowerCase()) return;

        const col = columns[task.status] || columns['todo'];

        // Robust team lookup
        const teamInfo = state.teams.find(t =>
            t.name.trim().toLowerCase() === taskTeam.toLowerCase()
        );

        const members = state.team.filter(m =>
            m.teamName && m.teamName.trim().toLowerCase() === taskTeam.toLowerCase()
        );

        // Include current user in member list if they are the team creator OR assigned to it
        if (state.user_profile) {
            const isCreator = teamInfo && (teamInfo.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
            const isAssigned = (state.user.team || '').toLowerCase() === taskTeam.toLowerCase();

            if (isCreator || isAssigned) {
                const isSelfInList = members.some(m => (m.email || '').toLowerCase() === (state.user_profile.personal.email || '').toLowerCase());
                if (!isSelfInList) {
                    members.push({
                        name: `${state.user_profile.personal.firstName} ${state.user_profile.personal.lastName}`,
                        role: state.user_profile.profile.role || 'Authority',
                        status: 'online'
                    });
                }
            }
        }

        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.animation = 'fadeInUp 0.5s ease-out';
        card.style.padding = '20px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '12px';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4 style="margin: 0; font-size: 1rem; color: var(--text-main); font-weight: 700;">${task.title}</h4>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${task.priority === 'high' || task.priority === 'critical' ? 'var(--danger)' : (task.priority === 'medium' ? 'var(--warning)' : 'var(--accent)')};" title="${task.priority} priority"></div>
            </div>
            
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${task.description || 'Executing professional objectives.'}
            </p>

            <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Responsibility</span>
                        <div style="font-size: 0.8rem; color: var(--primary); font-weight: 800; display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-users-viewfinder"></i>
                            ${(task.team || 'GENERAL').toUpperCase()}
                        </div>
                    </div>
                     <div style="text-align: right;">
                        <span style="font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">Phase</span>
                        <div style="font-size: 0.75rem; color: ${task.status === 'done' ? 'var(--accent)' : 'var(--warning)'}; font-weight: 900; display: flex; align-items: center; gap: 5px; justify-content: flex-end;">
                            <i class="fa-solid ${task.status === 'done' ? 'fa-circle-check' : 'fa-spinner fa-spin-slow'}"></i>
                            ${task.status === 'done' ? 'COMPLETE' : (task.status === 'in-progress' ? 'PROCESSING' : 'QUEUE')}
                        </div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 6px;">
                        <i class="fa-solid fa-diagram-project" style="color: var(--accent);"></i>
                        <span style="font-weight: 700; color: var(--text-main);">${(task.projectName || (teamInfo ? teamInfo.projectName : '') || 'Internal Development').toUpperCase()}</span>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${members.slice(0, 3).map(m => `
                            <div style="font-size: 0.6rem; background: var(--bg-surface); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                                <div style="width: 4px; height: 4px; border-radius: 50%; background: ${m.status === 'online' ? 'var(--accent)' : 'var(--text-dim)'};"></div>
                                ${m.name.split(' ')[0]}
                            </div>
                        `).join('')}
                        ${members.length > 3 ? `<span style="font-size: 0.6rem; color: var(--text-dim); padding-top: 2px;">+${members.length - 3} more</span>` : ''}
                    </div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                <div style="font-size: 0.65rem; color: var(--text-dim); font-family: var(--font-mono);">
                    <i class="fa-solid fa-hashtag"></i> ${(task._id || '').slice(-6).toUpperCase()}
                </div>
                <div style="display: flex; gap: 8px;">
                    ${task.status === 'todo' ? `
                        <button onclick="updateTaskStatus('${task._id}', 'in-progress')" class="btn-icon" style="width: 32px; height: 32px; color: var(--accent);" title="Start Process">
                            <i class="fa-solid fa-play"></i>
                        </button>
                    ` : ''}
                    ${task.status === 'in-progress' ? `
                        <button onclick="updateTaskStatus('${task._id}', 'testing')" class="btn-icon" style="width: 32px; height: 32px; color: #ec4899;" title="Send to Testing">
                            <i class="fa-solid fa-vial"></i>
                        </button>
                    ` : ''}
                    ${task.status === 'testing' && (state.user.role === 'admin' || (state.user.team && state.user.team.trim().toLowerCase() === 'testing team')) ? `
                        <button onclick="updateTaskStatus('${task._id}', 'done')" class="btn-icon" style="width: 32px; height: 32px; color: #10b981;" title="Approve & Complete">
                            <i class="fa-solid fa-check-double"></i>
                        </button>
                    ` : ''}
                    ${task.status === 'testing' && !(state.user.role === 'admin' || (state.user.team && state.user.team.trim().toLowerCase() === 'testing team')) ? `
                        <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); opacity: 0.5;" title="Awaiting QA Approval">
                            <i class="fa-solid fa-lock"></i>
                        </div>
                    ` : ''}
                    ${task.status === 'done' ? `
                        <button onclick="promoteToTimeline('${task._id}')" class="btn-icon" style="width: 32px; height: 32px; color: var(--primary);" title="Promote">
                            <i class="fa-solid fa-rocket"></i>
                        </button>
                    ` : ''}
                    <button onclick="deleteTask('${task._id}')" class="btn-icon" style="width: 32px; height: 32px; color: var(--danger);" title="Remove">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
        col.appendChild(card);
    });

    // Update task counts
    const counts = {
        'todo': 0,
        'in-progress': 0,
        'testing': 0,
        'done': 0
    };

    state.tasks.forEach(task => {
        const taskTeam = (task.team || '').trim();

        // Skip counting completed teams to stay consistent with board visibility
        const teamTasks = state.tasks.filter(tk => (tk.team || '').trim().toLowerCase() === taskTeam.toLowerCase());
        const isTeamComplete = teamTasks.length > 0 && teamTasks.every(tk => tk.status === 'done');
        if (isTeamComplete) return;

        let isVisible = false;

        if (state.user.role === 'admin') {
            isVisible = true;
        } else {
            const isAssigned = state.user.team && taskTeam.toLowerCase() === (state.user.team || '').toLowerCase();
            const isTeamCreator = state.teams.some(t => {
                const matchesTeam = t.name.toLowerCase() === taskTeam.toLowerCase();
                const matchesCreator = (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
                return matchesTeam && matchesCreator;
            });
            const isTaskCreator = (task.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();

            const isMember = state.team.some(m =>
                (m.teamName || '').trim().toLowerCase() === taskTeam.toLowerCase() &&
                ((m.username && m.username.toLowerCase() === state.user.username.toLowerCase()) ||
                    (m.name && m.name.toLowerCase() === state.user.username.toLowerCase()))
            );

            isVisible = isAssigned || isTeamCreator || isTaskCreator || isMember;
        }

        if (isVisible && (state.filters.team === 'all' || taskTeam.toLowerCase() === state.filters.team.toLowerCase())) {
            counts[task.status] = (counts[task.status] || 0) + 1;
        }
    });

    document.getElementById('count-todo').textContent = counts['todo'] || 0;
    document.getElementById('count-progress').textContent = counts['in-progress'] || 0;
    document.getElementById('count-testing').textContent = counts['testing'] || 0;
    document.getElementById('count-done').textContent = counts['done'] || 0;

    // Add Empty States for columns if no tasks were added
    Object.entries(columns).forEach(([key, col]) => {
        if (col && col.innerHTML === '') {
            col.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--text-muted); opacity: 0.4;">
                    <i class="fa-solid fa-layer-group fa-2x" style="margin-bottom: 15px;"></i>
                    <p style="font-size: 0.85rem; font-family: var(--font-mono);">Awaiting Deployment <br> ${state.filters.team !== 'all' ? `for ${state.filters.team}` : ''}</p>
                    ${state.user.role !== 'admin' ? `
                        <button onclick="showTaskModal()" class="btn-primary" style="margin: 20px auto; padding: 8px 16px; font-size: 0.7rem;">
                            <i class="fa-solid fa-plus"></i> Initialize Task
                        </button>
                    ` : ''}
                </div>
            `;
        }
    });
}


function renderReporting() {
    const container = document.getElementById('reporting-content');
    if (!container) return;

    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.status === 'done').length;
    const inProgress = state.tasks.filter(t => t.status === 'in-progress').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;

    container.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
            <div class="profile-card-mini" style="padding: 40px; text-align: center;">
                <div style="font-size: 3.5rem; font-weight: 800; color: var(--primary); font-family: var(--font-heading);">${total}</div>
                <h5 style="margin-top: 10px;">Execution Pipeline</h5>
                <p style="font-size: 0.9rem; color: var(--text-muted); font-weight: 400;">Total tasks under management</p>
            </div>
            
            <div class="profile-card-mini" style="padding: 40px; text-align: center; border-color: var(--accent);">
                <div style="font-size: 3.5rem; font-weight: 800; color: var(--accent); font-family: var(--font-heading);">${rate}%</div>
                <h5 style="margin-top: 10px; color: var(--accent);">Velocity Index</h5>
                <div style="width: 100%; height: 6px; background: rgba(16, 185, 129, 0.1); border-radius: 10px; margin-top: 15px; position: relative; overflow: hidden;">
                    <div style="position: absolute; left: 0; top: 0; height: 100%; width: ${rate}%; background: var(--accent); box-shadow: 0 0 10px var(--accent);"></div>
                </div>
            </div>

            <div class="profile-card-mini" style="padding: 40px; text-align: center;">
                <div style="font-size: 3.5rem; font-weight: 800; color: var(--warning); font-family: var(--font-heading);">${inProgress}</div>
                <h5 style="margin-top: 10px; color: var(--warning);">Active Threads</h5>
                <p style="font-size: 0.9rem; color: var(--text-muted); font-weight: 400;">Tasks currently in development</p>
            </div>

            <div class="profile-card-mini" style="grid-column: 1 / -1; padding: 40px; display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 40px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <h5 style="font-size: 1.2rem; color: var(--text-main); text-transform: none; letter-spacing: 0;">Productivity Quotient</h5>
                    <p style="color: var(--text-muted); font-size: 1rem; margin-top: 10px;">Your team is operating at ${rate > 70 ? 'Optimal' : 'Standard'} efficiency. ${done} milestones have been successfully delivered this cycle.</p>
                </div>
                <div style="display: flex; gap: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${done}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Shipped</div>
                    </div>
                    <div style="width: 1px; height: 40px; background: var(--border-color);"></div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${total - done}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Pending</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    renderTaskContext();
}

function renderTaskContext() {
    const filterChips = document.getElementById('team-filter-chips');
    const filterBar = document.querySelector('.filter-bar');

    if (filterChips) {
        let teams = ['all'];
        if (state.user.role === 'admin') {
            // Admin sees all teams from the master hierarchy
            teams = [...teams, ...state.teams.map(t => (t.name || '').trim())];
        } else {
            // Employee sees their assigned team + teams they created
            const myAssignedTeam = (state.user.team || '').trim();
            const myCreatedTeams = state.teams
                .filter(t => (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase())
                .map(t => (t.name || '').trim());
            teams = [...teams, ...new Set([myAssignedTeam, ...myCreatedTeams, 'Core Engine'])];
        }

        teams = [...new Set(teams)].filter(Boolean);

        // Filter out completed teams from chips
        teams = teams.filter(tName => {
            if (tName === 'all') return true;
            const normalizedTName = tName.trim().toLowerCase();
            const teamTasks = state.tasks.filter(tk => (tk.team || '').trim().toLowerCase() === normalizedTName);
            const isComplete = teamTasks.length > 0 && teamTasks.every(tk => tk.status === 'done');
            return !isComplete;
        });

        filterChips.innerHTML = teams.map(t => `
            <button onclick="filterByTeam('${t}')" 
                class="status-badge" 
                style="cursor: pointer; border: none; transition: all 0.2s; text-transform: uppercase; font-weight: 700;
                ${state.filters.team === t ? 'background: var(--primary); color: #0a0f1a;' : 'background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-color);'}">
                ${t === 'all' ? 'All Workspace' : t}
            </button>
        `).join('');
    }

    const memberList = document.getElementById('members-list');
    if (memberList) {
        const filteredMembers = state.filters.team === 'all'
            ? state.team
            : state.team.filter(m => m.teamName && m.teamName.trim().toLowerCase() === state.filters.team.trim().toLowerCase());

        memberList.innerHTML = filteredMembers.length > 0 ? filteredMembers.map(m => `
            <div class="avatar-sm" title="${m.name} (${m.role})" style="width: 32px; height: 32px; font-size: 0.8rem; cursor: help; border: 2px solid ${m.status === 'online' ? '#10b981' : '#cbd5e1'};">
                <i class="fa-solid fa-user"></i>
            </div>
        `).join('') : '<p style="font-size: 0.85rem; color: var(--text-muted);">No members found.</p>';
    }
}

function renderTimeline() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    // Helper: Identify Completed Teams
    const completedTeamNames = new Set(
        state.teams.filter(t => {
            const teamName = (t.name || '').trim().toLowerCase();
            const teamTasks = state.tasks.filter(tk => (tk.team || '').trim().toLowerCase() === teamName);
            return teamTasks.length > 0 && teamTasks.every(tk => tk.status === 'done');
        }).map(t => (t.name || '').trim().toLowerCase())
    );

    // 1. Map Team Deadlines (Filtered to REMOVE completed projects)
    const teamMilestones = state.teams.filter(t => {
        const teamName = (t.name || '').trim().toLowerCase();

        // Hide if project is already completed
        if (completedTeamNames.has(teamName)) return false;

        if (state.user.role === 'admin') {
            // Admin sees all deadlines set by any employee
            return t.deadline;
        }

        // Employee sees only deadlines they set
        const isCreator = (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
        return t.deadline && isCreator;
    }).map(t => ({
        title: `${t.projectName || t.name} Target`,
        date: new Date(t.deadline),
        category: t.department,
        description: t.description || 'Enterprise milestone for project delivery.',
        team: t.name,
        impact: 'Critical',
        type: 'deadline',
        icon: 'fa-calendar-check'
    }));

    // 2. Professional Shipments are removed once completed per user request
    const projectShipments = [];

    // Combine and Sort by date
    const combined = [...teamMilestones, ...projectShipments].sort((a, b) => a.date - b.date);

    if (combined.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 100px;">
                <i class="fa-solid fa-route fa-4x" style="color: var(--primary); opacity: 0.1; margin-bottom: 25px;"></i>
                <h3 style="font-weight: 800; color: var(--text-main);">Roadmap Horizon Empty</h3>
                <p style="color: var(--text-muted); margin-top: 10px;">Define team deadlines or showcase completed projects to build your roadmap.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = combined.map((item, idx) => `
        <div class="timeline-item" style="animation: fadeInLeft 0.5s ease-out ${idx * 0.1}s forwards; opacity: 0;">
            <div class="timeline-date">
                <h4 style="font-family: var(--font-mono); font-size: 0.9rem;">${item.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })}</h4>
                <p style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800;">${item.type === 'shipped' ? 'PROFESSIONAL WIN' : 'UPCOMING TARGET'}</p>
            </div>
            <div class="timeline-dot" style="border-color: ${item.type === 'shipped' ? 'var(--accent)' : 'var(--primary)'};"></div>
            <div class="timeline-content" style="border-left: 4px solid ${item.type === 'shipped' ? 'var(--accent)' : 'var(--primary)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="font-weight: 800; color: var(--text-main); font-size: 1.1rem;">${(item.title || '').toUpperCase()}</h4>
                        <span class="status-badge" style="background: ${item.type === 'shipped' ? 'var(--accent-glow)' : 'var(--primary-dim)'}; color: ${item.type === 'shipped' ? 'var(--accent)' : 'var(--primary)'}; font-size: 0.6rem; margin-top: 5px; display: inline-block; font-weight: 800;">
                           <i class="fa-solid ${item.icon}"></i> ${item.impact.toUpperCase()} ${item.type.toUpperCase()}
                        </span>
                    </div>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; font-weight: 400;">${item.description}</p>
                <div style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
                    <div class="avatar-sm" style="background: var(--bg-body); border: 1px solid var(--border-color);"><i class="fa-solid fa-users" style="font-size: 0.6rem; color: var(--text-muted);"></i></div>
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">${item.team} Directory</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Global Event Listeners
function setupGlobalEvents() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('#open-project-modal')) showProjectModal();
        if (e.target.closest('#add-testing-team-btn')) showAddTestingTeamModal();
        if (e.target.closest('#open-team-modal')) showTeamModal();
        if (e.target.closest('#open-new-team-modal')) showNewTeamModal();
        if (e.target.closest('#close-modal-btn') || e.target === modalContainer) {
            modalContainer.style.display = 'none';
        }
        if (e.target.closest('#logout-btn')) {
            logout();
        }
    });

    // Hide create buttons for Admin (only those that are truly restricted)
    if (state.user.role === 'admin') {
        const hideButtons = ['open-task-modal', 'open-new-team-modal', 'open-team-modal'];
        hideButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'none';
        });
    }

    // Hide Team Management buttons for Employees (One Role One Team policy) - NO LONGER RESTRICTED
    // Employees can now create teams and add members as requested.
}
function showTeamModal(preselectedTeamName = null) {
    const isAdmin = state.user.role === 'admin';

    // Determine available teams based on role
    let availableTeams = [];
    if (isAdmin) {
        availableTeams = state.teams;
    } else {
        // Employees can add to teams they created or are assigned to
        const createdTeams = state.teams.filter(t => (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase());
        const assignedTeam = state.teams.find(t => t.name === state.user.team);
        availableTeams = [...createdTeams];
        if (assignedTeam && !availableTeams.find(t => t._id === assignedTeam._id)) {
            availableTeams.push(assignedTeam);
        }
    }

    modalContainer.innerHTML = `
        <div class="modal-content card" style="max-width: 600px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div>
                    <h2 style="font-weight: 800; color: var(--text-main);">${isAdmin ? 'Create New Identity' : 'Add Team Member'}</h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">${isAdmin ? 'Create a profile and login access in one step.' : 'Add a new contributor to the workspace.'}</p>
                </div>
                <i class="fa-solid fa-user-plus fa-2x" style="opacity: 0.1;"></i>
            </div>
            <form id="team-member-form" style="display: flex; flex-direction: column; gap: 15px;">
                <div style="padding: 15px; background: rgba(0,0,0,0.02); border-radius: 12px;">
                    <h5 style="font-size: 0.7rem; text-transform: uppercase; color: var(--primary); margin-bottom: 10px; letter-spacing: 1px;">Profile Information</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <input type="text" id="m-name" placeholder="Full Name" class="form-control" required>
                        <input type="email" id="m-email" placeholder="Email Address" class="form-control" required>
                    </div>
                     <div style="margin-top: 12px;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display: block; margin-bottom: 5px;">ASSIGN TO TEAM</label>
                        <select id="m-team-select" class="form-control" required ${preselectedTeamName ? 'disabled' : ''}>
                            ${availableTeams.length > 0 ? availableTeams.map(t => `<option value="${t.name}" ${preselectedTeamName && t.name === preselectedTeamName ? 'selected' : ''}>${t.name}</option>`).join('') : '<option value="" disabled selected>No Teams Available</option>'}
                        </select>
                        ${preselectedTeamName ? `<input type="hidden" id="hidden-team-name" value="${preselectedTeamName}">` : ''}
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
                        <input type="text" id="m-role" placeholder="Role (e.g. Lead Designer)" class="form-control" required>
                        <select id="m-dept-select" class="form-control" required>
                           ${state.user.role === 'admin' ? `
                            <option value="Operations">Operations</option>
                            <option value="Development">Development</option>
                            <option value="Design">Design</option>
                            <option value="Testing">Testing</option>
                           ` : `<option value="Operations">Operations</option>`}
                        </select>
                    </div>
                    <div style="margin-top: 12px;">
                        <input type="tel" id="m-phone" placeholder="Phone Number" class="form-control">
                    </div>
                </div>

                ${isAdmin ? `
                <div style="padding: 15px; background: rgba(14, 165, 233, 0.03); border-radius: 12px; border: 1px solid var(--primary-dim);">
                    <h5 style="font-size: 0.7rem; text-transform: uppercase; color: var(--primary); margin-bottom: 10px; letter-spacing: 1px;">Access Control (Login)</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <input type="text" id="m-username" placeholder="Username" class="form-control" required>
                        <input type="password" id="m-password" placeholder="Password" class="form-control" required>
                    </div>
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" id="submit-member-btn" class="btn-primary" style="flex: 1;">${isAdmin ? 'Create Identity' : 'Add Member'}</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;


    modalContainer.style.display = 'flex';
    document.getElementById('team-member-form').onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-member-btn');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Processing...';

        const teamSelect = document.getElementById('m-team-select');
        const hiddenTeam = document.getElementById('hidden-team-name');
        const teamName = hiddenTeam ? hiddenTeam.value : (teamSelect ? teamSelect.value : (state.user.team || ''));

        if (!teamName) {
            alert("Please select a valid team to assign this member to.");
            submitBtn.disabled = false;
            submitBtn.innerText = isAdmin ? 'Create Identity' : 'Add Member';
            return;
        }

        // Auto-assign department based on selected Team
        const selectedTeamObj = state.teams.find(t => t.name === teamName);
        const department = selectedTeamObj ? selectedTeamObj.department : document.getElementById('m-dept-select').value;


        const data = {
            name: document.getElementById('m-name').value,
            email: document.getElementById('m-email').value,
            phone: document.getElementById('m-phone').value,
            role: document.getElementById('m-role').value,
            username: isAdmin ? document.getElementById('m-username').value : '',
            password: isAdmin ? document.getElementById('m-password').value : '',
            teamName: teamName,
            department: department,
            status: 'online'
        };

        try {
            const res = await fetch(`${API_BASE}/team`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Failed to create member');

            modalContainer.style.display = 'none';
            await fetchTeam();
            if (state.user.role === 'admin') await fetchUsers();
            renderTeam();
            alert('Member Added Successfully!');
        } catch (err) {
            alert(err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = 'Try Again';
        }
    };
}

function showNewTeamModal() {
    modalContainer.innerHTML = `
        <div class="modal-content card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <h2 style="font-weight: 800; color: var(--text-main);">Create New Team</h2>
                <i class="fa-solid fa-people-group fa-2x" style="opacity: 0.1;"></i>
            </div>
            <form id="new-team-form" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="nt-name" placeholder="Team Name" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                
                <select id="nt-dept" class="form-control" style="display: none;">
                    <option value="Operations" selected>Operations</option>
                </select>

                <input type="text" id="nt-project" placeholder="Project Name" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">

                <textarea id="nt-desc" placeholder="Briefly describe the team's purpose..." class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9; min-height: 80px;"></textarea>
                
                <div style="margin-top: 5px;">
                    <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-bottom: 5px; display: block;">TEAM DEADLINE</label>
                    <input type="date" id="nt-deadline" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" class="btn-primary" style="flex: 1;">Create Team</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;

    modalContainer.style.display = 'flex';
    document.getElementById('new-team-form').onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating...';

        const data = {
            name: document.getElementById('nt-name').value,
            department: document.getElementById('nt-dept').value,
            projectName: document.getElementById('nt-project').value,
            description: document.getElementById('nt-desc').value,
            capabilities: [], // Removed field, defaulting to empty
            deadline: document.getElementById('nt-deadline').value
        };

        try {
            const res = await fetch(`${API_BASE}/teams`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Failed to create team');

            modalContainer.style.display = 'none';
            await fetchTeamsHierarchy();
            renderTeam();
        } catch (err) {
            alert(err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = 'Create Team';
        }
    };
}

function showAddTestingTeamModal() {
    const predefinedTeams = state.teams.filter(t =>
        ['lexmanan', 'bharathi'].includes((t.name || '').toLowerCase())
    );

    modalContainer.innerHTML = `
        <div class="modal-content card" style="border-top: 4px solid #ec4899; max-width: 700px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div>
                    <h2 style="font-weight: 800; color: var(--text-main);">Testing Unit Deployment</h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">Select a specialized testing operation or establish a new custom unit.</p>
                </div>
                <i class="fa-solid fa-vial-circle-check fa-3x" style="opacity: 0.1; color: #ec4899;"></i>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                ${['lexmanan', 'bharathi'].map(teamName => {
        const existing = predefinedTeams.find(t => (t.name || '').toLowerCase() === teamName);
        return `
                        <div class="profile-card-mini" style="border: 2px solid #ec489920; border-left: 4px solid #ec4899; cursor: pointer; transition: 0.2s;" 
                             onmouseover="this.style.borderColor='#ec489950'" onmouseout="this.style.borderColor='#ec489920'"
                             onclick="quickDeployTestingTeam('${teamName}')">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h4 style="margin: 0; color: #ec4899; text-transform: uppercase; font-weight: 800;">${teamName}</h4>
                                <i class="fa-solid fa-microscope" style="opacity: 0.2;"></i>
                            </div>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">Specialized testing unit pre-configured for operational verification.</p>
                            <button class="btn-primary" style="margin-top: 15px; width: 100%; font-size: 0.7rem; background: #ec4899; border: none;">DEPLOY UNIT</button>
                        </div>
                    `;
    }).join('')}
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                 <button type="button" id="close-modal-btn" class="btn-outline" style="min-width: 120px;">Cancel Selection</button>
            </div>
        </div>
    `;

    modalContainer.style.display = 'flex';
}

window.quickDeployTestingTeam = async function (name) {
    const existingTeam = state.teams.find(t => (t.name || '').toLowerCase() === name.toLowerCase());
    if (existingTeam) {
        // Just refresh and alert, since admin already created it
        // Or we could trigger an "assignment" logic if needed
        alert(`Testing Unit [${name.toUpperCase()}] is actively deployed and ready for verification operations.`);
        modalContainer.style.display = 'none';
        return;
    }

    // If somehow not found, create it
    const data = {
        name: name,
        department: 'Testing',
        projectName: `Testing Operations - ${name.charAt(0).toUpperCase() + name.slice(1)}`,
        description: `Pre-configured unit for ${name} testing operations.`,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    try {
        const res = await fetch(`${API_BASE}/teams`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message || 'Failed to deploy unit');
        await fetchTeamsHierarchy();
        renderTeam();
        alert(`Specialized Testing Unit [${name.toUpperCase()}] established successfully.`);
        modalContainer.style.display = 'none';
    } catch (err) {
        alert(err.message);
    }
};

function showCreateUserModal(employeeId, employeeName) {
    modalContainer.innerHTML = `
        <div class="modal-content card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <h2 style="font-weight: 800; color: var(--text-main);">Create Login Credentials</h2>
                <i class="fa-solid fa-id-card fa-2x" style="opacity: 0.1;"></i>
            </div>
            <p style="margin-bottom: 20px; color: var(--text-muted);">Assigning access to <strong>${employeeName}</strong>.</p>
            <form id="create-user-form" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="u-username" placeholder="Username" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                <input type="password" id="u-password" placeholder="Password" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                <input type="hidden" id="u-employeeId" value="${employeeId}">
                
                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" class="btn-primary" style="flex: 1;">Generate Access</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.style.display = 'flex';
    document.getElementById('create-user-form').onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('u-username').value;
        const password = document.getElementById('u-password').value;
        const employeeId = document.getElementById('u-employeeId').value;

        try {
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    username,
                    password,
                    role: 'employee',
                    employeeId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            modalContainer.style.display = 'none';
            alert(`Success! Login created for ${username}`);
            await fetchUsers(); // Refresh users list
            renderTeam(); // Refresh UI to show badge
        } catch (err) {
            alert(err.message);
        }
    };
}

function showProjectModal() {
    modalContainer.innerHTML = `
        <div class="modal-content card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <h2 style="font-weight: 800; color: var(--text-main);">Showcase Achievement</h2>
                <i class="fa-solid fa-rocket fa-2x" style="opacity: 0.1;"></i>
            </div>
                <div id="reco-section" style="margin-bottom: 20px;">
                    ${(() => {
            const completedTeams = state.teams.filter(team => {
                const teamTasks = state.tasks.filter(t => (t.team || '').trim().toLowerCase() === team.name.trim().toLowerCase());
                return teamTasks.length > 0 && teamTasks.every(t => t.status === 'done');
            });

            if (completedTeams.length > 0) {
                return `
                                <div style="background: var(--bg-body); border: 2px dashed var(--accent-glow); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                                    <p style="font-size: 0.7rem; font-weight: 800; color: var(--accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Recommended Achievements</p>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">
                                        ${completedTeams.map(ct => `
                                            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                                                <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${ct.projectName || ct.name}</div>
                                                <button type="button" onclick="document.getElementById('p-title').value='${ct.projectName || ct.name}'; document.getElementById('p-team').value='${ct.name}'; document.getElementById('p-desc').value='Successfully completed all milestones with 100% delivery rate.';" class="btn-primary" style="padding: 5px 12px; font-size: 0.7rem; height: 30px;">Quick Showcase</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
            }
            return '';
        })()}
                </div>
                
                <form id="project-form" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="p-title" placeholder="Project or Product Name" class="form-control" required style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <select id="p-category" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                        <option value="Product">External Product</option>
                        <option value="Internal Tool">Infrastructure Tool</option>
                        <option value="Strategic">Strategic Move</option>
                    </select>
                    <input type="text" id="p-team" class="form-control" required readonly style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9; background: #f8fafc; color: var(--text-muted);" placeholder="Assigned Team">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <input type="number" id="p-users" placeholder="User Adoption Reach" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                    <input type="date" id="p-date" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;" value="${new Date().toISOString().split('T')[0]}">
                </div>

                <select id="p-impact" class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9;">
                    <option value="Incremental">Incremental</option>
                    <option value="Significant" selected>Significant Impact</option>
                    <option value="Revolutionary">Revolutionary</option>
                </select>

                <textarea id="p-desc" placeholder="Quantifiable results and professional summary..." class="form-control" style="padding: 12px; border-radius: 12px; border: 2px solid #f1f5f9; min-height: 100px;"></textarea>
                
                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" class="btn-primary" style="flex: 1;">Publish to Showcase</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.style.display = 'flex';
    document.getElementById('project-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('p-title').value,
            category: document.getElementById('p-category').value,
            team: document.getElementById('p-team').value,
            description: document.getElementById('p-desc').value,
            impact: document.getElementById('p-impact').value,
            completionDate: document.getElementById('p-date').value || new Date(),
            stats: {
                users: parseInt(document.getElementById('p-users').value) || 0,
                efficiency: 'Calculated'
            },
            status: 'Shipped'
        };

        await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        modalContainer.style.display = 'none';
        await fetchProjects();
        if (currentPage === 'timeline') renderTimeline();
        if (currentPage === 'showcase') renderShowcase();
    };
}

function renderShowcase() {
    const grid = document.getElementById('showcase-grid');
    const openModalBtn = document.getElementById('open-project-modal');
    if (!grid) return;

    if (openModalBtn) {
        // User requested to remove the manual showcase button
        openModalBtn.style.display = 'none';
    }

    // 1. Get manually added projects (filtered for employee if needed)
    let manualProjects = state.projects;
    if (state.user.role === 'employee') {
        manualProjects = state.projects.filter(p => (p.addedBy || '').toLowerCase() === (state.user.username || '').toLowerCase());
    }

    // 2. Automatically derive projects from Completed Teams
    const autoProjects = state.teams.filter(team => {
        const teamName = (team.name || '').trim().toLowerCase();
        const teamTasks = state.tasks.filter(t => (t.team || '').trim().toLowerCase() === teamName);
        const isComplete = teamTasks.length > 0 && teamTasks.every(t => t.status === 'done');

        if (!isComplete) return false;

        // Visibility: Admin sees all, Employee sees what they created
        if (state.user.role === 'admin') return true;
        return (team.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase();
    }).map(team => ({
        _id: `auto-${team._id}`,
        title: team.projectName || `${team.name} Launch`,
        category: team.department || 'Product',
        description: team.description || 'Enterprise solution successfully completed and verified.',
        team: team.name,
        impact: 'Significant',
        completionDate: new Date().toISOString(), // Use current or derive from last task
        addedBy: team.createdBy,
        isAuto: true,
        stats: { users: 150, efficiency: '+20%' }
    }));

    // Combine both sources
    const visibleProjects = [...manualProjects, ...autoProjects];

    if (visibleProjects.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 100px; grid-column: 1/-1; opacity: 0.5;">
                <i class="fa-solid fa-box-archive fa-4x" style="margin-bottom: 20px;"></i>
                <h3>Awaiting Enterprise Shipments</h3>
                <p>${state.user.role === 'admin' ? 'No projects showcased yet.' : 'Projects you complete and showcase will be featured here.'}</p>
            </div>`;
        return;
    }

    grid.innerHTML = visibleProjects.map((proj, idx) => `
        <div class="profile-card-mini" style="animation: fadeInUp 0.5s ease-out ${idx * 0.1}s forwards; padding: 0; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--border-color); background: var(--bg-surface);">
            <div style="padding: 25px; background: linear-gradient(135deg, var(--primary-dim), transparent); border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <span class="status-badge" style="background: var(--bg-surface); color: var(--accent); border: 1px solid var(--accent); font-size: 0.6rem; font-weight: 800;">
                        <i class="fa-solid fa-check-circle"></i> ${(proj.category || 'PROJECT').toUpperCase()}
                    </span>
                    <div style="display: flex; gap: 8px;">
                        ${!proj.isAuto ? `
                        <button onclick="deleteProject('${proj._id}')" class="btn-icon" style="color: var(--danger); width: 28px; height: 28px; font-size: 0.7rem; background: var(--bg-surface); border: 1px solid var(--border-color);">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                        ` : `
                        <span class="status-badge" style="background: var(--accent); color: white; border: none; font-size: 0.5rem;">AUTO-VERIFIED</span>
                        `}
                    </div>
                </div>
                <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-bottom: 5px;">${proj.title}</h3>
                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">
                    <i class="fa-solid fa-users-gear"></i>
                    <span>DEPLOYED BY: ${(proj.team || 'EXTERNAL').toUpperCase()}</span>
                </div>
            </div>
            
            <div style="padding: 25px; flex: 1;">
                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 20px;">
                    ${proj.description || 'Enterprise-grade solution engineered for high-performance operational excellence.'}
                </p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: auto;">
                    <div style="padding: 12px; background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px solid var(--border-color);">
                        <span style="display: block; font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px;">User Traction</span>
                        <div style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">
                            ${(proj.stats?.users || 0).toLocaleString()} <span style="font-size: 0.7rem; font-weight: 400; color: var(--text-muted);">Reached</span>
                        </div>
                    </div>
                    <div style="padding: 12px; background: rgba(0,0,0,0.02); border-radius: 12px; border: 1px solid var(--border-color);">
                        <span style="display: block; font-size: 0.6rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px;">Strategic Impact</span>
                        <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent);">
                            ${(proj.impact || 'SIGNIFICANT').toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 15px 25px; background: rgba(0,0,0,0.01); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.7rem; color: var(--text-dim); font-family: var(--font-mono); display: flex; flex-direction: column; gap: 2px;">
                    <div><i class="fa-solid fa-calendar-check"></i> ${new Date(proj.completionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                    <div style="opacity: 0.8;"><i class="fa-solid fa-user-tie"></i> BY: ${(proj.addedBy || 'System').toUpperCase()}</div>
                </div>
                <div style="display: flex; align-items: center; gap: -8px;">
                    <!-- Placeholder avatar for team members -->
                    <div class="avatar-sm" style="width: 24px; height: 24px; border: 2px solid var(--bg-surface);"><i class="fa-solid fa-user" style="font-size: 0.5rem;"></i></div>
                    <div class="avatar-sm" style="width: 24px; height: 24px; border: 2px solid var(--bg-surface); margin-left: -10px;"><i class="fa-solid fa-user" style="font-size: 0.5rem;"></i></div>
                    <span style="font-size: 0.6rem; color: var(--text-dim); margin-left: 5px;">+Team</span>
                </div>
            </div>
        </div>
    `).join('');
}

async function deleteProject(id) {
    if (!confirm('Remove this achievement?')) return;
    await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    await fetchProjects();
    if (currentPage === 'timeline') renderTimeline();
    if (currentPage === 'showcase') renderShowcase();
}

async function deleteTask(id) {
    if (!confirm('Relieve task?')) return;
    await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    await fetchTasks();
    renderTasks();
}

async function promoteToTimeline(taskId) {
    const task = state.tasks.find(t => t._id === taskId);
    if (!task) return;

    showProjectModal();

    // Pre-fill modal
    setTimeout(() => {
        const titleInput = document.getElementById('p-title');
        const teamInput = document.getElementById('p-team');
        const descInput = document.getElementById('p-desc');

        if (titleInput) titleInput.value = task.projectName || task.title;
        if (teamInput) teamInput.value = task.team;
        if (descInput) descInput.value = task.description || '';
    }, 100);
}

function showTaskModal() {
    modalContainer.innerHTML = `
        <div class="modal-content card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <h2 style="font-weight: 800; color: var(--text-main);">Create New Task</h2>
                <i class="fa-solid fa-list-check fa-2x" style="opacity: 0.1;"></i>
            </div>
            <form id="task-form" style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="t-title" placeholder="Task Title" class="form-control" required>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <select id="t-team" class="form-control" required>
                        ${state.user.role === 'admin'
            ? `<option value="" disabled selected>--- Select Team ---</option>${state.teams.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}`
            : (() => {
                const myTeams = state.teams.filter(t => (t.createdBy || '').toLowerCase() === (state.user.username || '').toLowerCase()).map(t => t.name);
                const allMyTeams = [...new Set([state.user.team, ...myTeams])].filter(Boolean);
                if (allMyTeams.length === 0) return '<option value="" disabled selected>No Teams Available - Create one first</option>';
                return allMyTeams.map(t => `<option value="${t}">${t}</option>`).join('');
            })()
        }
                    </select>
                    <select id="t-priority" class="form-control">
                        <option value="low">Low Priority</option>
                        <option value="medium" selected>Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                    <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: -10px;">Execution Deadline (Timeline Milestone)</label>
                    <input type="date" id="t-deadline" class="form-control">
                </div>

                <textarea id="t-desc" placeholder="Briefly describe the objective..." class="form-control" style="min-height: 80px;"></textarea>
                
                <select id="t-project" class="form-control">
                    <option value="" selected>--- Associated Project (Optional) ---</option>
                    ${state.projects.map(p => `<option value="${p.title}">${p.title}</option>`).join('')}
                </select>

                <div style="display: flex; gap: 12px; margin-top: 10px;">
                    <button type="submit" class="btn-primary" style="flex: 1;">Deploy Task</button>
                    <button type="button" id="close-modal-btn" class="btn-outline">Cancel</button>
                </div>
            </form>
        </div>
    `;
    modalContainer.style.display = 'flex';
    document.getElementById('task-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('t-title').value,
            team: document.getElementById('t-team').value,
            projectName: document.getElementById('t-project').value,
            priority: document.getElementById('t-priority').value,
            description: document.getElementById('t-desc').value,
            deadline: document.getElementById('t-deadline').value,
            status: 'todo'
        };

        await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        modalContainer.style.display = 'none';
        await fetchTasks();
        renderTasks();
    };
}

function filterByTeam(teamName) {
    state.filters.team = teamName;
    renderTasks();
    renderTaskContext(); // Refresh chips to show active state
}

function setActiveNav() {
    const steps = document.querySelectorAll('.steps .step');
    const path = window.location.pathname;

    steps.forEach(step => {
        step.classList.remove('active');
        const href = step.getAttribute('href');

        // Check if href matches current path or is index.html for root
        if (href && (path.includes(href) || (path.endsWith('/') && href === 'index.html'))) {
            step.classList.add('active');
        }
    });
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const task = state.tasks.find(t => t._id === taskId);
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) throw new Error('Failed to update task status');

        await fetchTasks();
        renderTasks();

        if (newStatus === 'done' && task) {
            const team = state.teams.find(t => t.name.trim().toLowerCase() === (task.team || '').trim().toLowerCase());
            if (team && confirm(`Task "${task.title}" completed! Would you like to dissolve the "${team.name}" team from the directory as well?`)) {
                const delRes = await fetch(`${API_BASE}/teams/${team._id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (delRes.ok) {
                    await fetchTeamsHierarchy();
                    await fetchTasks();
                    renderTasks();
                    if (currentPage === 'team') renderTeam();
                }
            }
        }
    } catch (err) {
        alert(err.message);
    }
}

init();

function renderTestingQueue() {
    const container = document.getElementById('testing-queue-container');
    if (!container) return;

    const isTestingTeamMember = (state.user.team && state.user.team.trim().toLowerCase() === 'testing team') ||
        (state.user.department && state.user.department.trim().toLowerCase() === 'testing');
    const isAdmin = state.user.role === 'admin';

    // Get all tasks in 'testing' status filtered by role-based access
    const testingTasks = state.tasks.filter(t => {
        if (t.status !== 'testing') return false;

        // Admin and Testing Team see everything in testing
        if (isAdmin || isTestingTeamMember) return true;

        // Regular Employee: Only see their own team's tasks that are in testing
        const myTeam = (state.user.team || '').trim().toLowerCase();
        const taskTeam = (t.team || '').trim().toLowerCase();
        return taskTeam === myTeam;
    });

    if (testingTasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-vial fa-4x" style="opacity: 0.1; margin-bottom: 20px;"></i>
                <h3 style="font-weight: 700; margin-bottom: 10px;">Testing Queue Empty</h3>
                <p style="font-size: 0.9rem;">No tasks are currently awaiting testing approval ${isAdmin || isTestingTeamMember ? '' : 'for your team'}.</p>
            </div>
        `;
        return;
    }

    const canApprove = isAdmin || isTestingTeamMember;

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 25px;">
            ${testingTasks.map(task => {
        const teamInfo = state.teams.find(t => t.name.trim().toLowerCase() === (task.team || '').trim().toLowerCase());
        const members = state.team.filter(m => m.teamName && m.teamName.trim().toLowerCase() === (task.team || '').trim().toLowerCase());

        return `
                    <div class="profile-card-mini" style="padding: 25px; animation: fadeInUp 0.5s ease-out; border-left: 4px solid #ec4899;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0; font-size: 1.1rem; color: var(--text-main); font-weight: 700;">${task.title}</h4>
                                <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                    <span style="font-size: 0.7rem; background: #ec489920; color: #ec4899; padding: 3px 10px; border-radius: 12px; font-weight: 700; text-transform: uppercase;">
                                        <i class="fa-solid fa-vial"></i> In Testing
                                    </span>
                                    <span style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">
                                        #${(task._id || '').slice(-6).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${task.priority === 'high' || task.priority === 'critical' ? 'var(--danger)' : (task.priority === 'medium' ? 'var(--warning)' : 'var(--accent)')};"></div>
                        </div>

                        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin: 15px 0;">
                            ${task.description || 'No description provided.'}
                        </p>

                        <div style="background: rgba(0,0,0,0.02); padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px solid var(--border-color);">
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">
                                <i class="fa-solid fa-users-viewfinder" style="color: var(--primary);"></i>
                                <span style="font-weight: 700; color: var(--text-main);">TEAM: ${(task.team || 'GENERAL').toUpperCase()}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--text-muted);">
                                <i class="fa-solid fa-diagram-project" style="color: var(--accent);"></i>
                                <span style="font-weight: 700; color: var(--text-main);">${(task.projectName || (teamInfo ? teamInfo.projectName : '') || 'Internal Development').toUpperCase()}</span>
                            </div>
                            ${members.length > 0 ? `
                                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                                    ${members.slice(0, 3).map(m => `
                                        <div style="font-size: 0.65rem; background: var(--bg-surface); padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border-color); color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                                            <div style="width: 4px; height: 4px; border-radius: 50%; background: ${m.status === 'online' ? 'var(--accent)' : 'var(--text-dim)'};"></div>
                                            ${m.name.split(' ')[0]}
                                        </div>
                                    `).join('')}
                                    ${members.length > 3 ? `<span style="font-size: 0.65rem; color: var(--text-dim); padding-top: 3px;">+${members.length - 3} more</span>` : ''}
                                </div>
                            ` : ''}
                        </div>

                        ${canApprove ? `
                            <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                                <button onclick="approveTestingTask('${task._id}')" class="btn-primary" style="flex: 1; padding: 10px; font-size: 0.85rem;">
                                    <i class="fa-solid fa-check-double"></i> Approve & Complete
                                </button>
                                <button onclick="rejectTestingTask('${task._id}')" class="btn-outline" style="padding: 10px 15px; font-size: 0.85rem; color: var(--danger); border-color: var(--danger);">
                                    <i class="fa-solid fa-rotate-left"></i> Send Back
                                </button>
                            </div>
                        ` : `
                            <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.02); border-radius: 8px; text-align: center; border: 1px dashed var(--border-color);">
                                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">
                                    <i class="fa-solid fa-lock" style="margin-right: 5px;"></i> Pending Quality Validation by Testing Team
                                </p>
                            </div>
                        `}
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

async function approveTestingTask(taskId) {
    if (!confirm('Approve this task and mark it as completed?')) return;

    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'done' })
        });

        if (!res.ok) throw new Error('Failed to approve task');

        await fetchTasks();
        renderTestingQueue();
        alert('Task approved and marked as complete!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function rejectTestingTask(taskId) {
    if (!confirm('Send this task back to In Progress?')) return;

    try {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'in-progress' })
        });

        if (!res.ok) throw new Error('Failed to reject task');

        await fetchTasks();
        renderTestingQueue();
        alert('Task sent back to In Progress.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

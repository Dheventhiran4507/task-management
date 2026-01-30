# Testing Team Setup & Workflow Guide

## Overview
The Testing Team feature allows you to create a dedicated QA/Testing team that reviews and approves tasks before they are marked as complete.

---

## Admin Setup Instructions

### Step 1: Create the Testing Team
1. **Login as Admin**
2. Navigate to **Team Directory** (Step 2 in navigation)
3. Click **"Create New Team"** button
4. Fill in the details:
   - **Team Name**: `Testing Team` (or `QA Team`)
   - **Department**: Operations
   - **Project Name**: `Quality Assurance`
   - **Description**: "Dedicated team for testing and quality validation"
   - **Deadline**: (Optional)
5. Click **"Create Team"**

### Step 2: Add Testing Team Members
1. Stay on the **Team Directory** page
2. Click **"Create Employee"** button
3. Fill in member details:
   - **Full Name**: Team member's name
   - **Email**: Team member's email
   - **Assign to Team**: Select `Testing Team`
   - **Role**: `QA Engineer` or `Test Lead`
   - **Phone**: (Optional)
   - **Username**: Create login username
   - **Password**: Create secure password
4. Click **"Create Identity"**
5. Repeat for all testing team members

---

## Workflow: How It Works

### For Employees (Task Creators)
1. Create and work on tasks normally
2. When task is **In Progress** and ready for testing:
   - Click the **Flask icon** (🧪) on the task card
   - Task moves to **"Testing"** status
3. Task now appears in the **Testing Queue** page

### For Testing Team Members
1. **Login** with testing team credentials
2. Navigate to **Testing Queue** (Step 4 in navigation)
3. Review tasks submitted for testing
4. For each task, you can:
   - **Approve & Complete**: ✅ Marks task as Done
   - **Send Back**: ↩️ Returns task to In Progress for fixes

### Task Flow Diagram
```
To Do → In Progress → Testing → Done
                        ↓
                   (Can reject back to In Progress)
```

---

## Access Control

- **Admin**: Can see all tasks in testing queue
- **Testing Team Members**: Can see all tasks in testing queue
- **Regular Employees**: Can see testing queue but only their own team's tasks

---

## Features

### Testing Queue Dashboard
- Shows all tasks currently in "Testing" status
- Displays:
  - Task title and description
  - Team and project information
  - Priority indicator
  - Team members involved
  - Task ID for tracking

### Approval Actions
- **Approve & Complete**: 
  - Confirms task meets quality standards
  - Moves task to "Done" status
  - Task appears in completed column
  
- **Send Back**:
  - Returns task to "In Progress"
  - Employee can make fixes and resubmit

---

## Best Practices

1. **Clear Testing Criteria**: Define what needs to be tested before approval
2. **Communication**: Use task descriptions to note testing requirements
3. **Quick Turnaround**: Review testing queue regularly to avoid bottlenecks
4. **Feedback Loop**: When sending back, communicate what needs fixing

---

## Troubleshooting

**Q: Testing team member can't see Testing Queue?**
- Ensure they are added to "Testing Team" in Team Directory
- Verify they have login credentials created

**Q: Tasks not appearing in Testing Queue?**
- Confirm task status is set to "testing"
- Check that task was moved using the Flask icon

**Q: Can't approve tasks?**
- Ensure you're logged in as testing team member or admin
- Refresh the page if needed

---

## Example Scenario

1. **Admin creates "Testing Team"** with 2 QA engineers
2. **Developer** creates task "Implement Login Feature"
3. Developer works on task (status: In Progress)
4. Developer completes coding, clicks **Flask icon** → Testing
5. **QA Engineer** logs in, sees task in Testing Queue
6. QA Engineer tests the feature:
   - If passes: Click **"Approve & Complete"** ✅
   - If fails: Click **"Send Back"** ↩️ with notes
7. If approved, task moves to **Done** ✓

---

## Notes

- Testing Team is a **regular team** created through Team Directory
- Any team member assigned to "Testing Team" can approve tasks
- Admin always has full access to Testing Queue
- Tasks remain in Testing Queue until approved or rejected

---

**Created**: January 2026  
**Version**: 1.0

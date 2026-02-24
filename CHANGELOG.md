# Changelog

All notable changes to Mind & Motion will be documented in this file.

Format: `[version] - date — description`

---

## [1.1.0] — 2026-02

### ✨ New Features

#### 📁 Folders (Task Categories)
- Users can now create **folders/categories** to organize tasks
- Each folder has a **name** and an **emoji icon**
- Folders can be **reordered** by drag-and-drop
- Deleting a folder safely **unlinks** all its tasks (tasks remain, folder_id = null)
- Backend: full CRUD for `/api/folders` with auto-migration for existing DBs

#### ✅ Subtasks
- Each task can now have **subtasks** (checklist items)
- Subtasks are stored in the dedicated `subtasks` table
- `subtasks_count` is returned with every task in the list API
- Backend: full CRUD for `/api/tasks/:taskId/subtasks` and `/api/subtasks/:id`

#### 🤌 Drag-and-Drop Task Sorting
- Tasks list now uses `DraggableFlatList` (react-native-draggable-flatlist)
- Long-press on the **≡ drag handle** icon to activate drag mode
- Built on top of `react-native-reanimated` for smooth 60fps animations

### 🔧 Improvements

#### API Service Layer (`src/services/api.js`)
- Added `foldersAPI`: `getFolders`, `createFolder`, `updateFolder`, `deleteFolder`, `reorderFolders`
- Added `subtasksAPI`: `getSubtasks`, `createSubtask`, `toggleSubtask`, `deleteSubtask`
- Extended `tasksAPI`: added `getStats` method and `params` support in `getTasks`

#### Database Migrations (auto-applied on server start)
- `folders` table with `order_index` column
- `folder_id` column added to `tasks` (FK → folders, ON DELETE SET NULL)
- `subtasks` table with task cascade delete

### 🛠 Internal / Cleanup
- Removed leftover `TasksScreen.js.save` file from repo
- Backend folder routes: `GET /api/folders`, `POST /api/folders`, `PUT /api/folders/:id`, `DELETE /api/folders/:id`, `PUT /api/folders/reorder`

---

## [1.0.0] — 2025-12

### Initial Release
- User registration and login with JWT (30-day token)
- Email verification via 6-digit code
- Password reset via email
- Habits tracking: create, edit, archive habits per month
- Habit monthly configs (custom plan/unit per month)
- Habit records: track daily progress with upsert logic
- Habit drag-and-drop reordering
- Tasks: create, edit, delete, mark as done
- Tasks: recurring tasks (daily / weekly / monthly / custom days)
- Tasks: priority levels, comments, deadlines
- Tasks: archive view by month/year
- Task statistics (today / week / month / all-time)
- Calendar screen with task overview
- User profile: edit name, birthdate, gender
- Change password from profile
- Birthdays tracker
- Theme system (light/dark/auto)
- Secret Cult Chat 🥑 (Easter egg feature)

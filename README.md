# 🎓 LMS / Educational Management System Mobile App

A comprehensive, role-based mobile application built with **React Native** and **TypeScript** for managing educational institutions. It streamlines daily academic operations including Exam scheduling, Noticeboard announcements, Leave applications, and User management, Batch,Subject,enrollemnt,teacher,student Management.

## ✨ Key Features

### 🔐 Role-Based Access Control (RBAC)
The app dynamically adapts its UI and functionality based on three primary user roles:
* **Admin:** Full access to manage all modules, review leaves, create users, and broadcast global announcements.
* **Teacher:** Can manage their own exams, apply for leaves, view specific announcements, and broadcast to their assigned batches.
* **Student:** Read-only access to view their scheduled exams, read targeted announcements, and apply for personal leaves.

### 📝 Module Highlights

* **📢 Announcements & Noticeboard**
    * Create and broadcast notices to targeted audiences (Everyone, All Students, All Teachers, or Specific Batches).
    * Attach up to 3 files (PDF, JPG, PNG) per announcement.
    * Pin important notices to the top of the feed.
    * Set auto-expiration dates for time-sensitive notices.
* **✍️ Exam Management**
    * Schedule exams (Midterm, Final, Quiz, Practical, Internal) for specific batches and subjects.
    * Set duration, total marks, passing marks, and venue.
    * Built-in Date and Time pickers for strict scheduling.
* **📅 Leave Management**
    * Apply for various leave types (Casual, Sick, Earned, Unpaid).
    * Select substitute teachers (for Teacher roles).
    * Admin dashboard to review, approve, or reject leave applications with remarks.
    * Filter leaves by Status (Pending, Approved, Rejected) and Type.
* **👥 User Management (Admin)**
    * Interactive KPI dashboard (Total Users, Students, Teachers, Admins).
    * Create, Edit, and Delete users.
    * Advanced filtering by Role and Batch.

## 🛠️ Tech Stack

* **Framework:** React Native / Expo
* **Language:** TypeScript
* **State Management:** React Context API (`ThemeContext`, Auth state)
* **Storage:** `@react-native-async-storage/async-storage` (User session & token management)
* **Navigation:** `@react-navigation/native` (Stack & Tab navigation)
* **UI Components:** * `@react-native-picker/picker` (Dropdowns)
    * `@react-native-community/datetimepicker` (Native Date/Time selection)
    * `react-native-vector-icons` (MaterialIcons)
* **File Handling:** `@react-native-documents/picker` (File attachments)

## 📂 Folder Structure 

```text
src/
├── api/                # API service wrappers (axios/fetch)
│   ├── announcementApi.ts
│   ├── batchApi.ts
│   ├── examApi.ts
│   ├── leaveApi.ts
│   ├── subjectApi.ts
│   └── userApi.ts
├── components/         # Reusable UI components
├── screens/            # Main application screens
│   ├── AnnouncementScreen.tsx
│   ├── ExamScreen.tsx
│   ├── LeaveScreen.tsx
│   └── UserScreen.tsx
├── theme/              # Theming configuration
│   └── ThemeContext.tsx
└── App.tsx             # Application entry point

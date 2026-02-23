# Tatun's Kambingan - Restaurant Management System

A unified, modern restaurant management system that combines beautiful frontend design with robust Supabase backend integration.

## Overview

This is a **merged project** combining the best of:
- **Frontend (SE2-Frontend)**: Beautiful UI/UX with responsive design
- **Backend (SE2-backend)**: Supabase database integration for real data management

### Key Features

✅ **User Authentication** - Supabase-powered login system (no more hardcoded credentials)
✅ **Dashboard** - Real-time statistics and analytics
✅ **Menu Management** - Add, edit, delete menu items
✅ **Order Management** - Track pending and completed orders
✅ **User Management** - Manage admin and staff users via Supabase
✅ **Role-Based Access** - Admin and Staff accounts with different permissions
✅ **Export Functionality** - Download orders as CSV/Excel
✅ **Responsive Design** - Works on desktop and mobile devices

## Project Structure

```
SE2-merged/
├── src/
│   ├── App.jsx              (Main app with Supabase auth)
│   ├── App.css
│   ├── Dashboard.jsx        (Analytics & stats)
│   ├── Menu.jsx             (Menu management)
│   ├── PendingOrders.jsx    (Pending order tracking)
│   ├── CompletedOrders.jsx  (Order history)
│   ├── ManageUsers.jsx      (User management)
│   ├── supabaseClient.js    (Supabase configuration)
│   ├── main.jsx
│   ├── index.css
│   ├── elements/            (Reusable components)
│   │   ├── Navbar.jsx
│   │   ├── ConfirmModal.jsx
│   │   └── *.css
│   └── utils/
│       └── numberFormat.js  (Formatting utilities)
├── index.html
├── vite.config.js
├── package.json
└── eslint.config.js
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Supabase account (free tier available at supabase.com)

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd SE2-merged
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Supabase:**
   - Get your Supabase credentials from your Supabase project
   - Update `src/supabaseClient.js` with your credentials:
     ```javascript
     export const supabase = createClient(
       "YOUR_SUPABASE_URL",
       "YOUR_SUPABASE_API_KEY"
     )
     ```

## Database Schema

Create the following tables in your Supabase project:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  active BOOLEAN DEFAULT true,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  orderTimestamp TIMESTAMP DEFAULT NOW(),
  orderType VARCHAR(50),
  paid BOOLEAN DEFAULT false,
  items JSONB,
  total DECIMAL(10, 2)
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER,
  amount DECIMAL(10, 2),
  payment_date TIMESTAMP DEFAULT NOW()
);
```

### Products Table (Menu)
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2),
  status VARCHAR(50),
  type VARCHAR(50),
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The app will start at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Key Changes from Original

### ❌ Removed
- Hardcoded user credentials (admin/admin123, staff/staff123)
- Mock data without backend
- localStorage-only data management

### ✅ Added
- Supabase authentication with real database
- Dynamic user roles from database
- Real data fetching from Supabase tables
- No more hardcoded passwords or functions
- Persistent storage in Supabase

## Authentication

Login credentials are now managed through Supabase:

1. Users must exist in the `users` table
2. Login validates name and password against database
3. User role determines access level:
   - **Admin**: Can access Dashboard, Menu, Orders, Users management
   - **Staff**: Can access Pending Orders and Completed Orders only

## Development Notes

### Frontend Framework
- React 19.2.0 with hooks
- Vite for fast development and builds

### UI Libraries
- **Bootstrap** - Component framework
- **Recharts** - Charts and visualizations
- **React Bootstrap** - Bootstrap React components

### Backend
- **Supabase** - PostgreSQL + Auth + Real-time updates
- **supabase-js** - JavaScript client library

### Styling
- Custom CSS with responsive design
- CSS Grid and Flexbox layouts
- Poppins font family

## Troubleshooting

### Login not working?
1. Check Supabase credentials in `src/supabaseClient.js`
2. Verify user exists in your Supabase `users` table
3. Check browser console for error messages

### Data not loading?
1. Verify Supabase tables are created with correct schema
2. Check Row Level Security (RLS) policies in Supabase
3. Ensure API key has proper permissions

### Styling issues?
1. Clear browser cache (Ctrl+Shift+Del)
2. Check that all CSS files are imported
3. Verify image paths in public/images folders

## Contributing

When modifying components:
1. Maintain the Supabase integration for data fetching
2. Keep the responsive design working
3. Update both src files and accompanying CSS
4. Test on multiple device sizes

## License

This project is part of the SE2 Software Engineering course.

## Support

For issues or questions:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review component code comments
3. Check console output for error messages

---

**Last Updated:** February 2026
**Version:** 1.0.0 (Merged)

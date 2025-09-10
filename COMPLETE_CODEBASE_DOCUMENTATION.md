# Land Deals Manager - Complete Codebase Documentation

## Project Overview
**Land Deals Manager** is a comprehensive full-stack web application for managing real estate deals, payments, owners, and investors. The application follows a modern architecture with React/Next.js frontend and Python Flask backend.

## Architecture

### Technology Stack
- **Frontend**: Next.js 15.5.0, React 19.1.0, Tailwind CSS 4.1.12
- **Backend**: Python Flask with MySQL database
- **Database**: MySQL (Aiven cloud hosting)
- **Authentication**: JWT tokens with Bearer authentication
- **File Upload**: Multipart form data handling
- **Deployment**: Vercel (frontend) + cloud hosting (backend)

### Directory Structure
```
Land-deals-manager/
├── land-deals-backend/        # Python Flask API server
│   ├── app.py                # Main Flask application (6453 lines)
│   ├── init_schema.sql       # Database schema definition
│   ├── migrations/           # Database migration scripts
│   ├── blueprints/          # Route organization
│   ├── sql/                 # SQL scripts
│   └── uploads/             # File upload storage
├── land-deals-frontend/my-app/ # Next.js React application
│   ├── pages/               # Next.js pages (routing)
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utilities and API client
│   └── styles/              # CSS and styling
└── backups/                 # Database backups
```

## Backend API Documentation

### Core Flask Application (`app.py`)
**File Size**: 6,453 lines
**Key Features**: 
- JWT authentication with token validation
- MySQL connection pooling with proper error handling
- Comprehensive API endpoints for all features
- File upload and document management
- PDF/CSV report generation
- Advanced installment payment system

### API Endpoints Summary

#### Authentication
- Health check endpoint for monitoring
- JWT token-based authentication
- Password verification with multiple hash support (bcrypt, pbkdf2, sha)

#### Payments API (Core Feature)
- `GET /api/payments` - List all payments with filters
- `GET /api/payments/{deal_id}` - Get payments for specific deal
- `POST /api/payments/{deal_id}` - Create new payment
- `PUT /api/payments/{deal_id}/{payment_id}` - Update payment
- `DELETE /api/payments/{deal_id}/{payment_id}` - Delete payment
- `GET /api/payments/{deal_id}/{payment_id}` - Get payment details

#### Advanced Payment Features
- `POST /api/payments/{deal_id}/split-installments` - Split payment into installments
- `GET /api/payments/{deal_id}/{payment_id}/installments` - Get installment timeline
- `POST /api/payments/{deal_id}/investor-to-owner` - Cross-party payments
- `POST /api/payments/{payment_id}/parties` - Add payment parties
- `POST /api/payments/{deal_id}/{payment_id}/proof` - Upload payment proof

#### Owners API (With Star Feature)
- `GET /api/owners` - List all owners with star status
- `GET /api/owners/{id}` - Get owner details
- `POST /api/owners` - Create new owner
- `POST /api/owners/{id}/star` - Star/unstar owner (Gmail-style)
- `GET /api/owners/starred` - Get only starred owners
- `PUT /api/owners/{id}` - Update owner
- `DELETE /api/owners/{id}` - Delete owner

#### Deals API
- Complete CRUD operations for deal management
- Status management (active, completed, cancelled)
- Financial tracking and reporting
- Document upload and management

#### Reports & Export
- `GET /api/payments/ledger.csv` - Export payments as CSV
- `GET /api/payments/ledger.pdf` - Export payments as PDF
- `GET /api/payments/ledger` - Get payment ledger data

### Database Schema

#### Core Tables
1. **users** - Authentication and user management
2. **deals** - Main deal information with location normalization
3. **owners** - Owner information with star functionality
4. **investors** - Investor management
5. **payments** - Payment records with installment support
6. **payment_parties** - Party involvement in payments
7. **payment_proofs** - Document attachments for payments

#### Star Feature Schema
```sql
-- owners table includes:
is_starred BOOLEAN DEFAULT FALSE  -- Gmail-style star functionality
```

#### Installment System Schema
```sql
-- payments table includes:
is_installment BOOLEAN DEFAULT FALSE,
installment_number INT NULL,
total_installments INT NULL,
parent_amount DECIMAL(15,2) NULL
```

## Frontend Documentation

### Next.js Application Structure

#### Key Pages
1. **`/pages/owners.js`** - Main owners listing with star functionality
2. **`/pages/owners/[id].js`** - Owner detail view
3. **`/pages/deals/new.js`** - Create deal (uses starred owners dropdown)
4. **`/pages/payments/[dealId]/new.js`** - Payment creation with installments
5. **`/pages/payments/[dealId]/[paymentId].js`** - Payment detail with installment timeline
6. **`/pages/dashboard.js`** - Main dashboard
7. **`/pages/login.js`** - Authentication

#### API Client (`lib/api.js`)
**Features**:
- Axios-based HTTP client with interceptors
- JWT token automatic attachment
- Request caching for performance (2-minute cache)
- Request deduplication to prevent duplicate calls
- Comprehensive error handling

**API Modules**:
```javascript
export const ownersAPI = {
  getAll: () => api.get('/owners'),
  getStarred: () => api.get('/owners/starred'),  // Star feature
  star: (id, starred) => api.post(`/owners/${id}/star`, { starred }),
  // ... other CRUD operations
}
```

#### Star Feature Implementation
- **Gmail-style star system** for owners
- Toggle star status with visual feedback
- Filter to show only starred owners
- Integration in create deal page (dropdown shows only starred owners)
- Eye button navigation to owner detail pages

#### Installment System Implementation
- **Professional installment UI** following PayPal/Stripe design patterns
- 4-card dashboard showing installment progress
- Visual timeline with color-coded status indicators
- Progress bars and percentage tracking
- Smart detection and contextual warnings

### Component Architecture

#### Navigation
- `Navbar` component with user authentication state
- Responsive design for mobile/desktop
- Route-based active state indicators

#### Form Components
- React Hook Form integration
- Input validation and error handling
- File upload components for documents
- Date pickers and form controls

#### Data Display
- Table components with sorting and filtering
- Modal dialogs for confirmations
- Progress indicators and status badges
- Responsive grid layouts

## Feature Documentation

### 1. Gmail-Style Star System
**Status**: ✅ FULLY IMPLEMENTED
**Backend**: 
- `is_starred` column in owners table
- `/api/owners/starred` endpoint
- `/api/owners/{id}/star` endpoint
**Frontend**:
- Star toggle in owners listing
- Starred-only filter in create deal page
- Visual star indicators throughout UI

### 2. Advanced Installment System
**Status**: ✅ PRODUCTION READY
**Features**:
- Split payments into 2-12 installments
- Multiple frequency options (monthly, quarterly, yearly)
- Custom dates and amounts
- Professional timeline visualization
- Progress tracking across all pages
- Contextual warnings for editing

### 3. Payment Management
**Status**: ✅ ENTERPRISE-GRADE
**Features**:
- Complete payment CRUD operations
- Multi-party payment support
- Document proof attachments
- Status tracking and management
- Advanced filtering and search
- Export to CSV/PDF

### 4. Document Management
**Status**: ✅ OPERATIONAL
**Features**:
- Secure file upload system
- Multiple document types support
- Document categorization
- Download and preview capabilities

## Security & Authentication

### JWT Implementation
- Bearer token authentication
- Token expiration handling
- Automatic token refresh
- Secure password hashing (bcrypt, pbkdf2)

### Data Validation
- Frontend form validation
- Backend API validation
- SQL injection prevention
- File upload security

## Performance Optimizations

### Frontend
- Request caching (2-minute duration)
- Request deduplication
- Lazy loading for large datasets
- Optimized bundle size with Next.js

### Backend
- Database connection pooling
- Efficient SQL queries with JOINs
- Proper indexing (performance_indexes.sql)
- Response compression

## Testing & Quality Assurance

### Test Files Available
- `test_installment_system.py` - Backend installment testing
- `test_api.py` - General API testing
- `test_auth_api.py` - Authentication testing
- `test_full_flow.py` - End-to-end testing

### Code Quality
- ESLint configuration for frontend
- Comprehensive error handling
- Logging and debugging features
- Backward compatibility maintenance

## Deployment Configuration

### Backend
- `vercel.json` for deployment
- Environment variable management
- Database migration scripts
- Health check endpoints

### Frontend
- Next.js production optimization
- Tailwind CSS optimization
- Static asset optimization
- Progressive Web App features

## Current Status & Capabilities

### ✅ Fully Operational Features
1. **User Authentication** - JWT-based with secure password handling
2. **Deal Management** - Complete CRUD with status tracking
3. **Owner Management** - With Gmail-style star system
4. **Investor Management** - Full lifecycle management
5. **Payment System** - Advanced installment support
6. **Document System** - File upload and management
7. **Reporting** - CSV/PDF export capabilities
8. **Dashboard** - Real-time data visualization

### 🚀 Advanced Features
1. **Installment Payments** - Industry-standard implementation
2. **Star System** - Gmail-style owner favoriting
3. **Cross-Deal Tracking** - Payment relationships
4. **Multi-Party Payments** - Complex payment scenarios
5. **Financial Reporting** - Comprehensive analytics

### 🛡️ Security Features
1. **JWT Authentication** - Secure token-based auth
2. **Password Security** - Multiple hash algorithm support
3. **Input Validation** - Frontend and backend validation
4. **File Security** - Secure upload handling
5. **SQL Injection Prevention** - Parameterized queries

## Development Guidelines

### Code Maintenance
- **Backend**: Main logic in `app.py` (6,453 lines) - well-organized with clear function separation
- **Frontend**: Modular component architecture with clear separation of concerns
- **Database**: Migration-based schema management
- **API**: RESTful design with consistent patterns

### Adding New Features
1. Create migration script for database changes
2. Add backend API endpoints in `app.py`
3. Update API client in `lib/api.js`
4. Create/update frontend components
5. Add appropriate testing
6. Update documentation

This documentation provides a complete understanding of the Land Deals Manager codebase, enabling future development without the need to repeatedly examine individual files.

## Emergency Reference

### Critical Files
- `land-deals-backend/app.py` - Main Flask application (ALL backend logic)
- `land-deals-frontend/my-app/lib/api.js` - API client (ALL frontend-backend communication)
- `land-deals-frontend/my-app/pages/owners.js` - Owner management with star feature
- `land-deals-backend/init_schema.sql` - Database schema reference

### Quick Debug Commands
- Frontend build: `npm run build` in my-app directory
- Backend health: `GET /healthz` endpoint
- Database check: Migration scripts in migrations/ directory
- Error logs: Check browser console and backend terminal

This comprehensive documentation ensures that all future development can proceed efficiently without requiring repeated file exploration.

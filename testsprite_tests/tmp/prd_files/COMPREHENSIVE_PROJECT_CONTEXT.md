# Land Deals Manager - Comprehensive Project Context

## 🏗️ Project Overview

**Land Deals Manager** is a comprehensive full-stack web application for managing real estate deals, payments, owners, and investors. The application follows modern architecture with React/Next.js frontend and Python Flask backend, designed for professional property management workflows.

### Core Business Logic
- **Deal Management**: Create, track, and manage land purchase/sale transactions
- **Payment Processing**: Handle complex payment workflows with installment support
- **Investor & Owner Management**: Track stakeholders with percentage shareholding
- **Financial Reporting**: Generate comprehensive reports and analytics
- **Document Management**: Structured document upload and organization
- **Star System**: Gmail-style favorites for quick access

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.5.0 (React 19.1.0)
- **Styling**: Tailwind CSS 4.1.12
- **Routing**: Next.js file-based routing (Pages Router)
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **HTTP Client**: Axios with request caching and deduplication
- **Authentication**: JWT tokens with Bearer authentication
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **PDF Generation**: jsPDF for client-side reports
- **Notifications**: react-hot-toast

### Backend
- **Framework**: Python Flask
- **Database**: MySQL (Aiven cloud hosting)
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Upload**: Werkzeug secure file handling
- **CORS**: Flask-CORS for cross-origin requests
- **Compression**: Flask-Compress for response optimization
- **PDF Generation**: ReportLab for server-side PDF reports
- **Environment**: python-dotenv for configuration

### Database
- **Database**: Aiven MySQL cloud service

## 📁 Project Structure

```
Land-deals-manager/
├── land-deals-backend/                 # Python Flask API Server
│   ├── app.py                         # Main Flask application (6614 lines)
│   ├── init_schema.sql                # Complete database schema
│   ├── document_manager.py            # File upload management
│   ├── wsgi.py                        # WSGI entry point
│   ├── requirements.txt               # Python dependencies
│   ├── vercel.json                    # Vercel deployment config
│   ├── migrations/                    # Database migration scripts
│   │   ├── 20250901_add_purchase_amount.sql
│   │   ├── 20250901_add_status_and_pay_to.sql
│   │   ├── 20250906_add_installment_fields.sql
│   │   └── ...
│   ├── blueprints/                    # Route organization
│   │   ├── __init__.py
│   │   ├── deals.py
│   │   └── investors.py
│   ├── sql/                           # SQL utility scripts
│   └── uploads/                       # File storage directory
├── land-deals-frontend/my-app/        # Next.js React Application
│   ├── pages/                         # Next.js pages (routing)
│   │   ├── _app.js                    # App wrapper
│   │   ├── dashboard.js               # Main dashboard
│   │   ├── login.js                   # Authentication
│   │   ├── owners.js & owners/[id].js # Owner management
│   │   ├── investors.js & investors/[id].js # Investor management
│   │   ├── deals/                     # Deal management
│   │   │   ├── all.js                 # Deals listing
│   │   │   ├── new.js                 # Create deal form
│   │   │   ├── [id].js                # Deal details/edit
│   │   │   └── payments.js            # Payment management
│   │   ├── payments/index.js          # Global payments view
│   │   ├── reports/index.js           # Reports & analytics
│   │   └── admin/                     # Administration
│   ├── components/                    # Reusable React components
│   │   ├── layout/                    # Layout components
│   │   │   └── Navbar.js              # Navigation component
│   │   └── common/                    # Common UI components
│   │       └── ConfirmModal.js        # Modal dialogs
│   ├── lib/                           # Utilities and configurations
│   │   ├── api.js                     # API client with caching
│   │   ├── auth.js                    # Authentication utilities
│   │   └── permissions.js             # Role-based permissions
│   ├── app/                           # App directory
│   │   └── globals.css                # Global styles
│   ├── styles/                        # Additional styling
│   ├── tailwind.config.js             # Tailwind configuration
│   ├── package.json                   # Node.js dependencies
│   └── next.config.js                 # Next.js configuration
└── backups/                           # Database backups
    ├── payments_backup_*.sql
    ├── payment_parties_backup_*.sql
    └── payment_proofs_backup_*.sql
```

## 🗄️ Database Schema

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. Deals Table (Main Entity)
```sql
CREATE TABLE deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    state VARCHAR(100),
    district VARCHAR(100),
    state_id INT,
    district_id INT,
    area DECIMAL(10,2),
    price DECIMAL(15,2),
    deal_type ENUM('buy', 'sell', 'lease') DEFAULT 'buy',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE SET NULL,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL
);
```

#### 3. Owners Table (with Star Feature)
```sql
CREATE TABLE owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    address TEXT,
    is_starred BOOLEAN DEFAULT FALSE,  -- Gmail-style star system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

#### 4. Investors Table (with Star Feature)
```sql
CREATE TABLE investors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    investor_name VARCHAR(100) NOT NULL,
    investment_amount DECIMAL(15,2),
    investment_percentage DECIMAL(5,2),
    mobile VARCHAR(15),
    email VARCHAR(100),
    aadhar_card VARCHAR(14),
    pan_card VARCHAR(10),
    address TEXT,
    is_starred BOOLEAN DEFAULT FALSE,  -- Gmail-style star system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

#### 5. Payments Table (with Installment Support)
```sql
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    party_type ENUM('owner','buyer','investor','other') DEFAULT 'other',
    party_id INT DEFAULT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    status ENUM('pending','completed','cancelled','failed','overdue') DEFAULT 'pending',
    payment_type ENUM('land_purchase','investment_sale','documentation_legal','maintenance_taxes','other','advance','partial','final','registration') DEFAULT 'other',
    due_date DATE NULL,
    -- Installment System Fields
    is_installment BOOLEAN DEFAULT FALSE,
    installment_number INT NULL,
    total_installments INT NULL,
    parent_amount DECIMAL(15,2) NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);
```

#### 6. Payment Parties Table
```sql
CREATE TABLE payment_parties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    party_type VARCHAR(64) NOT NULL,
    party_id INT DEFAULT NULL,
    amount DECIMAL(15,2) DEFAULT NULL,
    percentage DECIMAL(5,2) DEFAULT NULL,
    pay_to_id INT NULL,
    pay_to_name VARCHAR(255) NULL,
    pay_to_type ENUM('owner', 'investor', 'other') NULL,
    role ENUM('payer', 'payee') NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
```

#### 7. Payment Proofs Table
```sql
CREATE TABLE payment_proofs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    file_path VARCHAR(1024) NOT NULL,
    file_name VARCHAR(255) DEFAULT NULL,
    doc_type VARCHAR(128) DEFAULT NULL,
    uploaded_by INT DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);
```

## 🔌 API Architecture

### Base Configuration
- **Base URL**: Backend hosted on cloud with CORS enabled
- **Authentication**: JWT Bearer tokens
- **Content Types**: JSON for data, multipart/form-data for files
- **Error Handling**: Standardized error responses

### API Client Structure (`lib/api.js`)
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Request cache for performance (2-minute cache)
const requestCache = new Map()

// Automatic JWT token attachment
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Core API Modules

#### 1. Deals API
```javascript
export const dealAPI = {
  getAll: () => api.get('/deals'),
  getById: (id) => cachedRequest(() => api.get(`/deals/${id}`)),
  create: (data) => api.post('/deals', data),
  update: (id, data) => api.put(`/deals/${id}`, data),
  updateStatus: (id, status) => api.put(`/deals/${id}/status`, { status }),
  delete: (id) => api.delete(`/deals/${id}`),
  
  // Document management
  uploadLandDocuments: (dealId, formData) => 
    api.post(`/deals/${dealId}/land-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  uploadOwnerDocuments: (dealId, ownerId, formData) => 
    api.post(`/deals/${dealId}/owners/${ownerId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Location management
  updateLocation: (dealId, locationData) => 
    api.put(`/deals/${dealId}/location`, locationData),
  updatePurchaseAmount: (dealId, purchaseAmount) => 
    api.put(`/deals/${dealId}/purchase-amount`, { purchase_amount: purchaseAmount }),
}
```

#### 2. Owners API (with Star Feature)
```javascript
export const ownersAPI = {
  getAll: () => api.get('/owners'),
  getStarred: () => api.get('/owners/starred'),  // Gmail-style starred
  getById: (id) => api.get(`/owners/${id}`),
  create: (data) => api.post('/owners', data),
  update: (id, data) => api.put(`/owners/${id}`, data),
  delete: (id) => api.delete(`/owners/${id}`),
  star: (id, starred = true) => api.post(`/owners/${id}/star`, { starred }),
  
  // Percentage shares management
  updatePercentageShares: (dealId, ownerShares) => {
    const ownerSharesList = Object.entries(ownerShares).map(([ownerId, percentage]) => ({
      owner_id: parseInt(ownerId),
      percentage_share: parseFloat(percentage)
    }))
    return api.put(`/deals/${dealId}/owners/percentage-shares`, {
      owner_shares: ownerSharesList
    })
  }
}
```

#### 3. Investors API (with Star Feature)
```javascript
export const investorsAPI = {
  getAll: () => api.get('/investors'),
  getStarred: () => api.get('/investors/starred'),  // Gmail-style starred
  getById: (id) => api.get(`/investors/${id}`),
  create: (data) => api.post('/investors', data),
  update: (id, data) => api.put(`/investors/${id}`, data),
  delete: (id) => api.delete(`/investors/${id}`),
  star: (id, starred = true) => api.post(`/investors/${id}/star`, { starred }),
  
  // Deal-Investor Association
  addToDeal: (dealId, investorData) => api.post(`/deals/${dealId}/investors`, investorData),
  getAvailableInvestors: (dealId) => api.get(`/investors/available/${dealId}`),
  
  // Percentage shares management
  updatePercentageShares: (dealId, investorShares) => {
    const investorSharesList = Object.entries(investorShares).map(([investorId, percentage]) => ({
      investor_id: parseInt(investorId),
      percentage_share: parseFloat(percentage)
    }))
    return api.put(`/deals/${dealId}/investors/percentage-shares`, {
      investor_shares: investorSharesList
    })
  }
}
```

#### 4. Payments API (with Installment Support)
```javascript
export const paymentsAPI = {
  list: (dealId) => api.get(`/payments/${dealId}`),
  listAll: () => api.get('/payments'),
  detail: (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}`),
  create: (dealId, data, options = {}) => api.post(`/payments/${dealId}`, data, options),
  update: (dealId, paymentId, data) => api.put(`/payments/${dealId}/${paymentId}`, data),
  delete: (dealId, paymentId) => api.delete(`/payments/${dealId}/${paymentId}`),
  
  // Installment system
  createInstallments: (dealId, data) => api.post(`/payments/${dealId}/split-installments`, data),
  
  // Proof management
  uploadProof: (dealId, paymentId, formData) => 
    api.post(`/payments/${dealId}/${paymentId}/proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  listProofs: (dealId, paymentId) => api.get(`/payments/${dealId}/${paymentId}/proofs`),
  deleteProof: (dealId, paymentId, proofId) => 
    api.delete(`/payments/${dealId}/${paymentId}/proofs/${proofId}`),
  
  // Investor to Owner payments
  createInvestorToOwnerPayment: (dealId, paymentData) => 
    api.post(`/payments/${dealId}/investor-to-owner`, paymentData),
  
  // Reporting
  ledger: (filters) => api.get('/payments/ledger', { params: filters }),
  ledgerCsv: (filters) => api.get('/payments/ledger.csv', { 
    params: filters, 
    responseType: 'blob' 
  }),
  ledgerPdf: (filters) => api.get('/payments/ledger.pdf', { 
    params: filters, 
    responseType: 'blob' 
  }),
}
```

## 🎨 UI Design System & Theme

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 
                'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 
                'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 
                'Noto Color Emoji'],
      },
    },
  },
  plugins: [],
}
```

### Color Palette & Design Tokens
```css
/* Primary Colors */
--color-slate-50: #f8fafc;
--color-slate-100: #f1f5f9;
--color-slate-200: #e2e8f0;
--color-slate-300: #cbd5e1;
--color-slate-400: #94a3b8;
--color-slate-500: #64748b;
--color-slate-600: #475569;
--color-slate-700: #334155;
--color-slate-800: #1e293b;
--color-slate-900: #0f172a;

/* Accent Colors */
--color-blue-500: #3b82f6;
--color-blue-600: #2563eb;
--color-blue-700: #1d4ed8;
--color-green-500: #22c55e;
--color-green-600: #16a34a;
--color-red-500: #ef4444;
--color-red-600: #dc2626;
--color-yellow-500: #eab308;
--color-amber-600: #d97706;
```

### Component Design Patterns

#### 1. Layout Structure
- **Full-width layouts** with consistent padding
- **Card-based sections** with subtle shadows
- **Responsive grid systems** (1-4 columns)
- **Professional spacing** (padding: 6-8, margins: 4-6)

#### 2. Navigation Design
```javascript
// Professional navbar with consistent branding
<nav className="w-full bg-white border-b border-slate-200 shadow-sm">
  <div className="px-6 py-4">
    <div className="flex items-center justify-between">
      {/* Brand section with icon */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
          {/* SVG Icon */}
        </div>
        <div>
          <span className="font-bold text-xl text-slate-900">Property Hub</span>
          <p className="text-xs text-slate-600">Management System</p>
        </div>
      </div>
      
      {/* Navigation links */}
      <div className="hidden lg:flex items-center space-x-8">
        {/* Menu items */}
      </div>
    </div>
  </div>
</nav>
```

#### 3. Button Patterns
```css
/* Primary Button */
.btn-primary {
  @apply bg-slate-900 text-white px-6 py-3 rounded font-medium hover:bg-slate-800 transition-colors;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-white text-slate-900 px-6 py-3 rounded border border-slate-300 hover:bg-slate-50 transition-colors;
}

/* Success Button */
.btn-success {
  @apply bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors;
}

/* Danger Button */
.btn-danger {
  @apply bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors;
}
```

#### 4. Form Input Styling
```css
/* Standard Input */
.form-input {
  @apply w-full px-3 py-2 border border-slate-300 rounded placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500;
}

/* Select Dropdown */
.form-select {
  @apply w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500;
}

/* Textarea */
.form-textarea {
  @apply w-full px-3 py-2 border border-slate-300 rounded placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 resize-vertical;
}
```

#### 5. Card Component Pattern
```javascript
// Professional card design
<div className="bg-white rounded-lg shadow-sm border border-slate-200">
  <div className="p-6">
    {/* Card header */}
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {/* Action buttons */}
    </div>
    
    {/* Card content */}
    <div className="space-y-4">
      {/* Content here */}
    </div>
  </div>
</div>
```

#### 6. Table Design
```css
/* Professional table styling */
.data-table {
  @apply w-full border-collapse;
}

.data-table th {
  @apply bg-slate-50 border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 uppercase tracking-wide;
}

.data-table td {
  @apply border-b border-slate-200 px-4 py-3 text-sm text-slate-900;
}

.data-table tr:hover {
  @apply bg-slate-50;
}
```

## 🔐 Authentication & Authorization

### JWT Token System
```javascript
// lib/auth.js
export const login = async (username, password) => {
  const response = await api.post('/login', { username, password })
  const { token, user } = response.data
  
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  
  return { token, user }
}

export const getToken = () => localStorage.getItem('token')
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null')
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
```

### Permission System
```javascript
// lib/permissions.js
export const PERMISSIONS = {
  DEALS_CREATE: 'deals:create',
  DEALS_EDIT: 'deals:edit',
  DEALS_DELETE: 'deals:delete',
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_CREATE: 'payments:create',
  REPORTS_GENERATE: 'reports:generate',
  ADMIN_ACCESS: 'admin:access',
}

export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission) || user.role === 'admin'
}
```

## 📊 Key Features Implementation

### 1. Star System (Gmail-style)
- **Database**: `is_starred BOOLEAN` column in owners/investors tables
- **API**: `POST /owners/{id}/star` with `{ starred: true/false }`
- **UI**: Yellow star icons with toggle functionality
- **Integration**: Used in dropdowns and quick-access lists

### 2. Installment Payment System
- **Database**: Additional columns in payments table for installment metadata
- **Logic**: Parent payment split into multiple child payments
- **API**: `POST /payments/{dealId}/split-installments`
- **UI**: Enhanced payment forms with installment options

### 3. Investment Calculation Logic
```javascript
// Complex investment calculation based on payments
const calculateInvestmentAmounts = (payments, investors) => {
  const investmentData = {}
  
  investors.forEach(investor => {
    // ID-based matching (preferred)
    const idBasedPayments = payments.filter(payment => 
      payment.party_type === 'investor' && payment.party_id === investor.id
    )
    
    // Name-based matching (fallback)
    const nameBasedPayments = payments.filter(payment =>
      payment.party_type === 'investor' && 
      payment.investor_name?.toLowerCase().includes(investor.investor_name.toLowerCase())
    )
    
    const totalInvested = [...idBasedPayments, ...nameBasedPayments]
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0)
    
    investmentData[investor.id] = {
      totalInvested,
      paymentCount: idBasedPayments.length + nameBasedPayments.length,
      percentageShare: investor.investment_percentage || 0
    }
  })
  
  return investmentData
}
```

### 4. Advanced Filtering & Search
- **Real-time search** across multiple fields
- **Status-based filtering** (active, completed, cancelled)
- **Date range filtering** with custom periods
- **Type-based filtering** for payments and deals
- **Combined filters** with URL state management

### 5. Document Management System
- **Structured uploads** by category (land docs, owner docs, payment proofs)
- **File type validation** and size limits
- **Organized storage** with deal-based folder structure
- **Document metadata** tracking (upload time, user, type)

## 🔄 Data Flow Patterns

### 1. Page Component Structure
```javascript
export default function PageComponent() {
  // State management
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  
  // Authentication check
  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
  }, [])
  
  // Data fetching with error handling
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.getData()
      setData(response.data)
    } catch (error) {
      if (error?.response?.status === 401) {
        logout()
        router.push('/login')
      } else {
        toast.error('Failed to fetch data')
      }
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])
  
  // Render logic with loading states
  if (!user || loading) return <LoadingComponent />
  
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} onLogout={handleLogout} />
      {/* Page content */}
    </div>
  )
}
```

### 2. API Request Pattern with Caching
```javascript
// Cached request implementation
const cachedRequest = (requestFn, cacheKey, maxAge = 2 * 60 * 1000) => {
  const cached = requestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return Promise.resolve(cached.data)
  }
  
  return requestFn().then(response => {
    requestCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })
    return response
  })
}
```

### 3. Error Handling Pattern
```javascript
// Consistent error handling across the app
const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error?.response?.status === 401) {
    toast.error('Session expired. Please login again.')
    logout()
    router.push('/login')
  } else if (error?.response?.data?.error) {
    toast.error(error.response.data.error)
  } else {
    toast.error(defaultMessage)
  }
}
```

## 🚀 Development Guidelines

### 1. File Naming Conventions
- **Pages**: camelCase for dynamic routes (`[id].js`), lowercase for static (`dashboard.js`)
- **Components**: PascalCase (`Navbar.js`, `ConfirmModal.js`)
- **Utilities**: camelCase (`api.js`, `auth.js`)
- **Styles**: lowercase with hyphens (`globals.css`)

### 2. Component Organization
- **Layout components** in `components/layout/`
- **Common/shared components** in `components/common/`
- **Feature-specific components** co-located with pages
- **Utility functions** in `lib/` directory

### 3. State Management Patterns
- **Local state** for component-specific data
- **URL state** for filters and pagination
- **localStorage** for user preferences and auth
- **Props drilling** for shared component data

### 4. Styling Guidelines
- **Utility-first** approach with Tailwind CSS
- **Consistent spacing** using Tailwind's spacing scale
- **Professional color palette** based on slate/blue theme
- **Responsive design** with mobile-first approach
- **Hover states** and transitions for interactive elements

### 5. Performance Optimization
- **Request caching** for frequently accessed data
- **Request deduplication** to prevent duplicate API calls
- **Image optimization** using Next.js Image component
- **Code splitting** through Next.js automatic optimization
- **Lazy loading** for non-critical components

## 🧪 Testing & Quality Assurance

### Testing Files Present
- `test_api.py` - General API testing
- `test_auth_api.py` - Authentication testing
- `test_create_deal_stars.py` - Star feature testing
- `test_full_flow.py` - End-to-end workflow testing
- `test_installment_creation.py` - Installment system testing
- `test_installment_system.py` - Comprehensive installment testing
- `test_star_api.py` - Star functionality testing

### Database Validation
- `check_database.py` - Database connectivity and schema validation
- `check_columns.py` - Column existence and type validation
- `verify_cloud_db.py` - Cloud database verification
- Migration scripts for schema updates

## 📈 Business Logic Implementation

### 1. Investment Tracking
- **Percentage-based shareholding** for investors and owners
- **Actual payment tracking** vs. promised investments
- **Cross-deal investor management** with consolidated views
- **Performance analytics** and ROI calculations

### 2. Payment Workflows
- **Multi-party payments** with flexible party assignment
- **Installment creation** from lump-sum amounts
- **Payment proof attachments** with categorization
- **Status tracking** (pending, completed, failed, overdue)
- **Due date management** with reminder capabilities

### 3. Deal Lifecycle Management
- **Status progression** (active → completed → cancelled)
- **Document categorization** (land docs, legal docs, payment proofs)
- **Stakeholder management** with role-based access
- **Financial summaries** with real-time calculations

### 4. Reporting & Analytics
- **Payment ledger** with comprehensive filtering
- **Export capabilities** (PDF, CSV)
- **Deal performance metrics** 
- **Investor portfolio views**
- **Owner relationship tracking**

This comprehensive context provides all necessary information for another AI to understand and work with the Land Deals Manager project, including architecture, implementation patterns, business logic, and development guidelines. The project follows modern web development best practices with a focus on professional real estate management workflows.
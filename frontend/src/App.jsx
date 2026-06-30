import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LandingPage from './pages/LandingPage'
import ModuleGuard from './components/ModuleGuard'

// Auth
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Admin
import Dashboard from './pages/admin/Dashboard'
import CustomersList from './pages/admin/customers/CustomersList'
import AddCustomer from './pages/admin/customers/AddCustomer'
import CustomerDetail from './pages/admin/customers/CustomerDetail'
import Memberships from './pages/admin/memberships/Memberships'
import Subscriptions from './pages/admin/subscriptions/Subscriptions'
import Attendance from './pages/admin/attendance/Attendance'
import Payments from './pages/admin/payments/Payments'
import DuePayments from './pages/admin/payments/DuePayments'
import Invoices from './pages/admin/payments/Invoices'
import Expenses from './pages/admin/payments/Expenses'
import Reports from './pages/admin/reports/Reports'
import Enquiries from './pages/admin/enquiries/Enquiries'
import Targets from './pages/admin/targets/Targets'
import Tasks from './pages/admin/tasks/Tasks'
import Staff from './pages/admin/staff/Staff'
import EmailPromotions from './pages/admin/promotions/EmailPromotions'
import PromoDatabase from './pages/admin/promotions/PromoDatabase'
import Settings from './pages/admin/settings/Settings'
import Branches from './pages/admin/settings/Branches'
import UserPermissions from './pages/admin/settings/UserPermissions'
import Backup from './pages/admin/settings/Backup'
import Profile from './pages/admin/settings/Profile'
import MyBusiness from './pages/admin/settings/MyBusiness'

// Superadmin
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard'
import SuperadminGyms from './pages/superadmin/SuperadminCompanies'
import SuperadminGymDetail from './pages/superadmin/SuperadminCompanyDetail'
import SuperadminUsers from './pages/superadmin/SuperadminUsers'
import SuperadminSubscriptions from './pages/superadmin/SuperadminSubscriptions'
import SuperadminPricing from './pages/superadmin/SuperadminPricing'
import SuperadminBilling from './pages/superadmin/SuperadminBilling'
import SuperadminModuleReports from './pages/superadmin/SuperadminModuleReports'
import SuperadminPendingApprovals from './pages/superadmin/SuperadminPendingApprovals'
import AcceptInvite from './pages/auth/AcceptInvite'
import VerifyEmail from './pages/auth/VerifyEmail'
import AdminPendingApprovals from './pages/admin/PendingApprovals'

// Customer
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MySubscription from './pages/customer/MySubscription'
import MyAttendance from './pages/customer/MyAttendance'
import MyPayments from './pages/customer/MyPayments'
import Messages from './pages/customer/Messages'
import CustomerProfile from './pages/customer/CustomerProfile'

// Shared loading spinner
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
  </div>
)

// Route Guards
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  const role = String(user.role)
  if (role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />
  if (role === 'customer') return <Navigate to="/customer/dashboard" replace />
  if (role !== 'admin' && role !== 'staff') return <Navigate to="/login" replace />
  return children
}

function CustomerRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  const role = String(user.role)
  if (role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />
  if (role === 'admin' || role === 'staff') return <Navigate to="/admin/dashboard" replace />
  if (role !== 'customer') return <Navigate to="/login" replace />
  return children
}

function SuperadminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (String(user.role) !== 'superadmin') return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* ── Admin ─────────────────────────────────── */}
      <Route path="/admin/dashboard"        element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/customers"        element={<AdminRoute><CustomersList /></AdminRoute>} />
      <Route path="/admin/customers/add"    element={<AdminRoute><AddCustomer /></AdminRoute>} />
      <Route path="/admin/customers/pending" element={<AdminRoute><AdminPendingApprovals /></AdminRoute>} />
      <Route path="/admin/customers/:id"    element={<AdminRoute><CustomerDetail /></AdminRoute>} />
      <Route path="/admin/memberships"      element={<AdminRoute><Memberships /></AdminRoute>} />
      <Route path="/admin/subscriptions"    element={<AdminRoute><Subscriptions /></AdminRoute>} />
      <Route path="/admin/attendance"       element={<AdminRoute><Attendance /></AdminRoute>} />
      <Route path="/admin/payments"         element={<AdminRoute><Payments /></AdminRoute>} />
      <Route path="/admin/due-payments"     element={<AdminRoute><DuePayments /></AdminRoute>} />
      <Route path="/admin/invoices"         element={<AdminRoute><Invoices /></AdminRoute>} />
      <Route path="/admin/expenses"         element={<AdminRoute><Expenses /></AdminRoute>} />
      <Route path="/admin/reports"          element={<AdminRoute><Reports /></AdminRoute>} />
      <Route path="/admin/enquiries"        element={<AdminRoute><Enquiries /></AdminRoute>} />
      <Route path="/admin/targets"          element={<AdminRoute><Targets /></AdminRoute>} />
      <Route path="/admin/tasks"            element={<AdminRoute><Tasks /></AdminRoute>} />
      <Route path="/admin/staff"            element={<AdminRoute><Staff /></AdminRoute>} />
      <Route path="/admin/email-promotions" element={<AdminRoute><EmailPromotions /></AdminRoute>} />
      <Route path="/admin/promo-database"   element={<AdminRoute><PromoDatabase /></AdminRoute>} />
      <Route path="/admin/settings"         element={<AdminRoute><Settings /></AdminRoute>} />
      <Route path="/admin/branches"         element={<AdminRoute><Branches /></AdminRoute>} />
      <Route path="/admin/permissions"      element={<AdminRoute><UserPermissions /></AdminRoute>} />
      <Route path="/admin/backup"           element={<AdminRoute><Backup /></AdminRoute>} />
      <Route path="/admin/profile"          element={<AdminRoute><Profile /></AdminRoute>} />
      <Route path="/admin/business"         element={<AdminRoute><MyBusiness /></AdminRoute>} />

      {/* ── Superadmin ────────────────────────────── */}
      <Route path="/superadmin/dashboard"         element={<SuperadminRoute><SuperadminDashboard /></SuperadminRoute>} />
      <Route path="/superadmin/companies"         element={<SuperadminRoute><SuperadminGyms /></SuperadminRoute>} />
      <Route path="/superadmin/companies/:id"     element={<SuperadminRoute><SuperadminGymDetail /></SuperadminRoute>} />
      <Route path="/superadmin/users"             element={<SuperadminRoute><SuperadminUsers /></SuperadminRoute>} />
      <Route path="/superadmin/pending-approvals" element={<SuperadminRoute><SuperadminPendingApprovals /></SuperadminRoute>} />
      <Route path="/superadmin/subscriptions"     element={<SuperadminRoute><SuperadminSubscriptions /></SuperadminRoute>} />
      <Route path="/superadmin/billing"           element={<SuperadminRoute><SuperadminBilling /></SuperadminRoute>} />
      <Route path="/superadmin/module-reports"    element={<SuperadminRoute><SuperadminModuleReports /></SuperadminRoute>} />
      <Route path="/superadmin/pricing"           element={<SuperadminRoute><SuperadminPricing /></SuperadminRoute>} />

      {/* ── Customer ──────────────────────────────── */}
      <Route path="/customer/dashboard"    element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
      <Route path="/customer/subscription" element={<CustomerRoute><MySubscription /></CustomerRoute>} />
      <Route path="/customer/attendance"   element={<CustomerRoute><MyAttendance /></CustomerRoute>} />
      <Route path="/customer/payments"     element={<CustomerRoute><MyPayments /></CustomerRoute>} />
      <Route path="/customer/messages"     element={<CustomerRoute><Messages /></CustomerRoute>} />
      <Route path="/customer/profile"      element={<CustomerRoute><CustomerProfile /></CustomerRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

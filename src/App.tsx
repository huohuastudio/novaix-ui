import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SiteSettingsProvider } from '@/hooks/use-site-settings'
import ProtectedRoute from '@/components/protected-route'
import MaintenanceGuard from '@/components/maintenance-guard'
import DemoBanner from '@/components/demo-banner'
import DemoDialog from '@/components/demo-dialog'
import LicenseGuard from '@/components/license-guard'
import { Skeleton } from '@/components/ui/skeleton'

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const PortalLayout = lazy(() => import('@/layouts/PortalLayout'))
const AdminLogin = lazy(() => import('@/pages/admin/login'))
const Dashboard = lazy(() => import('@/pages/admin/dashboard'))
const Nodes = lazy(() => import('@/pages/admin/nodes'))
const NodeDetail = lazy(() => import('@/pages/admin/nodes/detail'))
const IPs = lazy(() => import('@/pages/admin/ips'))
const Images = lazy(() => import('@/pages/admin/images'))
const Plans = lazy(() => import('@/pages/admin/plans'))
const TrafficPackages = lazy(() => import('@/pages/admin/traffic-packages'))
const Instances = lazy(() => import('@/pages/admin/instances'))
const CreateInstance = lazy(() => import('@/pages/admin/instances/create'))
const InstanceDetail = lazy(() => import('@/pages/admin/instances/detail'))
const CreateProfile = lazy(() => import('@/pages/admin/profiles/create'))
const Users = lazy(() => import('@/pages/admin/users'))
const UserDetail = lazy(() => import('@/pages/admin/users/detail'))
const Orders = lazy(() => import('@/pages/admin/orders'))
const Payments = lazy(() => import('@/pages/admin/payments'))
const Coupons = lazy(() => import('@/pages/admin/coupons'))
const Announcements = lazy(() => import('@/pages/admin/announcements'))
const Tickets = lazy(() => import('@/pages/admin/tickets'))
const Alerts = lazy(() => import('@/pages/admin/alerts'))
const Logs = lazy(() => import('@/pages/admin/logs'))
const Tasks = lazy(() => import('@/pages/admin/tasks'))
const Settings = lazy(() => import('@/pages/admin/settings'))
const ISOs = lazy(() => import('@/pages/admin/isos'))
const Agents = lazy(() => import('@/pages/admin/agents'))
const SharedIPs = lazy(() => import('@/pages/admin/shared-ips'))
const Integrations = lazy(() => import('@/pages/admin/integrations'))
const Plugins = lazy(() => import('@/pages/admin/plugins'))
const Themes = lazy(() => import('@/pages/admin/themes'))
const VPCs = lazy(() => import('@/pages/admin/vpcs'))
const VPCDetail = lazy(() => import('@/pages/admin/vpcs/detail'))
const About = lazy(() => import('@/pages/admin/about'))
const PortalLogin = lazy(() => import('@/pages/portal/login'))
const PortalDashboard = lazy(() => import('@/pages/portal/dashboard'))
const PortalInstances = lazy(() => import('@/pages/portal/instances'))
const PortalInstanceDetail = lazy(() => import('@/pages/portal/instances/detail'))
const PortalOrders = lazy(() => import('@/pages/portal/orders'))
const PortalOrderDetail = lazy(() => import('@/pages/portal/orders/detail'))
const PortalTickets = lazy(() => import('@/pages/portal/tickets'))
const PortalTicketDetail = lazy(() => import('@/pages/portal/tickets/detail'))
const PortalWallet = lazy(() => import('@/pages/portal/wallet'))
const PortalProfile = lazy(() => import('@/pages/portal/profile'))
const PortalAnnouncements = lazy(() => import('@/pages/portal/announcements'))
const PortalPurchase = lazy(() => import('@/pages/portal/purchase'))
const PortalInstanceUpgrade = lazy(() => import('@/pages/portal/instances/upgrade'))
const PortalRegister = lazy(() => import('@/pages/portal/register'))
const PortalResetPassword = lazy(() => import('@/pages/portal/reset-password'))
const OAuthComplete = lazy(() => import('@/pages/portal/oauth/complete'))
const PortalNotifications = lazy(() => import('@/pages/portal/notifications'))
const PortalAgent = lazy(() => import('@/pages/portal/agent'))
const PortalVPCs = lazy(() => import('@/pages/portal/vpcs'))
const PortalImpersonate = lazy(() => import('@/pages/portal/impersonate'))
import { useAdminPath } from '@/hooks/use-site-settings'
import Home from './pages/Home'
const Legal = lazy(() => import('./pages/Legal'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function AppRoutes() {
  const adminPath = useAdminPath()

  return (
    <Routes>
      <Route path="/" element={<MaintenanceGuard><Home /></MaintenanceGuard>} />
      <Route path={`${adminPath}/login`} element={<AdminLogin />} />
      <Route
        path={adminPath}
        element={
          <ProtectedRoute requiredRole="admin" loginPath={`${adminPath}/login`}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="nodes" element={<Nodes />} />
        <Route path="nodes/:id/*" element={<NodeDetail />} />
        <Route path="ips/*" element={<IPs />} />
        <Route path="shared-ips/*" element={<SharedIPs />} />
        <Route path="images/*" element={<Images />} />
        <Route path="plans/*" element={<Plans />} />
        <Route path="traffic-packages" element={<TrafficPackages />} />
        <Route path="instances" element={<Instances />} />
        <Route path="instances/create" element={<CreateInstance />} />
        <Route path="instances/:id/*" element={<InstanceDetail />} />
        <Route path="profiles/create" element={<CreateProfile />} />
        <Route path="isos/*" element={<ISOs />} />
        <Route path="agents/*" element={<Agents />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id/*" element={<UserDetail />} />
        <Route path="orders/*" element={<Orders />} />
        <Route path="payments" element={<Payments />} />
        <Route path="coupons/*" element={<Coupons />} />
        <Route path="announcements/*" element={<Announcements />} />
        <Route path="tickets/*" element={<Tickets />} />
        <Route path="vpcs" element={<VPCs />} />
        <Route path="vpcs/:id" element={<VPCDetail />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="plugins" element={<Plugins />} />
        <Route path="themes" element={<Themes />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="logs/*" element={<Logs />} />
        <Route path="settings/*" element={<Settings />} />
        <Route path="about" element={<About />} />
      </Route>
      {/* 用户端 */}
      <Route path="/login" element={<MaintenanceGuard><PortalLogin /></MaintenanceGuard>} />
      <Route path="/register" element={<MaintenanceGuard><PortalRegister /></MaintenanceGuard>} />
      <Route path="/reset-password" element={<MaintenanceGuard><PortalResetPassword /></MaintenanceGuard>} />
      <Route path="/oauth/complete" element={<OAuthComplete />} />
      <Route path="/portal/impersonate" element={<PortalImpersonate />} />
      <Route
        path="/portal"
        element={
          <MaintenanceGuard>
            <ProtectedRoute loginPath="/login">
              <PortalLayout />
            </ProtectedRoute>
          </MaintenanceGuard>
        }
      >
        <Route index element={<PortalDashboard />} />
        <Route path="servers" element={<PortalInstances />} />
        <Route path="servers/:id/upgrade" element={<PortalInstanceUpgrade />} />
        <Route path="servers/:id/*" element={<PortalInstanceDetail />} />
        <Route path="orders" element={<PortalOrders />} />
        <Route path="orders/:id" element={<PortalOrderDetail />} />
        <Route path="tickets" element={<PortalTickets />} />
        <Route path="tickets/:id" element={<PortalTicketDetail />} />
        <Route path="wallet" element={<PortalWallet />} />
        <Route path="profile" element={<PortalProfile />} />
        <Route path="announcements" element={<PortalAnnouncements />} />
        <Route path="notifications" element={<PortalNotifications />} />
        <Route path="purchase" element={<PortalPurchase />} />
        <Route path="agent" element={<PortalAgent />} />
        <Route path="vpcs" element={<PortalVPCs />} />
      </Route>
      <Route path="/legal/:type" element={<Legal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteSettingsProvider>
      <LicenseGuard>
      <DemoBanner />
      <DemoDialog />
      <TooltipProvider>
        <Suspense fallback={<PageSkeleton />}>
          <AppRoutes />
        </Suspense>
      </TooltipProvider>
      </LicenseGuard>
      </SiteSettingsProvider>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  )
}

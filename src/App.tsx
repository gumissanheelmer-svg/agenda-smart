import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/hooks/useAuth";
import { BarbershopProvider } from "@/hooks/useBarbershop";
import { DynamicThemeProvider } from "@/components/DynamicThemeProvider";
import BarbershopList from "./pages/BarbershopList";
import BarbershopHome from "./pages/BarbershopHome";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PendingApproval from "./pages/PendingApproval";
import DashboardOverview from "./pages/admin/DashboardOverview";
import AppointmentsList from "./pages/admin/AppointmentsList";
import BarbersList from "./pages/admin/BarbersList";
import ServicesList from "./pages/admin/ServicesList";
import ClientsList from "./pages/admin/ClientsList";
import ExpensesList from "./pages/admin/ExpensesList";
import SettingsPage from "./pages/admin/SettingsPage";
import ManagersPage from "./pages/admin/ManagersPage";
import BarberAccountsPage from "./pages/admin/BarberAccountsPage";
import ProfessionalSchedulesPage from "./pages/admin/ProfessionalSchedulesPage";
import AttendanceManagementPage from "./pages/admin/AttendanceManagementPage";
import BarberRegister from "./pages/BarberRegister";
import BarberDashboard from "./pages/BarberDashboard";
import BarbershopRegister from "./pages/BarbershopRegister";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BarbershopProvider>
          <DynamicThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<BarbershopList />} />
                  <Route path="/b/:slug" element={<BarbershopHome />} />
                  
                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<Login />} />
                  <Route path="/barber/login" element={<Login />} />
                  <Route path="/barber/register" element={<BarberRegister />} />
                  <Route path="/register" element={<BarbershopRegister />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  
                  {/* Super Admin routes */}
                  <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
                  
                  {/* Admin routes */}
                  <Route path="/admin/dashboard" element={<AdminDashboard />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="appointments" element={<AppointmentsList />} />
                    <Route path="barbers" element={<BarbersList />} />
                    <Route path="schedules" element={<ProfessionalSchedulesPage />} />
                    <Route path="attendance" element={<AttendanceManagementPage />} />
                    <Route path="services" element={<ServicesList />} />
                    <Route path="clients" element={<ClientsList />} />
                    <Route path="expenses" element={<ExpensesList />} />
                    <Route path="managers" element={<ManagersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="accounts" element={<BarberAccountsPage />} />
                  </Route>
                  
                  {/* Barber routes */}
                  <Route path="/barber/dashboard" element={<BarberDashboard />} />
                  
                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </DynamicThemeProvider>
        </BarbershopProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

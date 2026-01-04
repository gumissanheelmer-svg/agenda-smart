import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import DashboardOverview from "./pages/admin/DashboardOverview";
import AppointmentsList from "./pages/admin/AppointmentsList";
import BarbersList from "./pages/admin/BarbersList";
import ServicesList from "./pages/admin/ServicesList";
import ClientsList from "./pages/admin/ClientsList";
import SettingsPage from "./pages/admin/SettingsPage";
import BarberAccountsPage from "./pages/admin/BarberAccountsPage";
import BarberRegister from "./pages/BarberRegister";
import BarberLogin from "./pages/BarberLogin";
import BarberDashboard from "./pages/BarberDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />}>
                <Route index element={<DashboardOverview />} />
                <Route path="appointments" element={<AppointmentsList />} />
                <Route path="barbers" element={<BarbersList />} />
                <Route path="services" element={<ServicesList />} />
                <Route path="clients" element={<ClientsList />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="accounts" element={<BarberAccountsPage />} />
              </Route>
              <Route path="/barber/register" element={<BarberRegister />} />
              <Route path="/barber/login" element={<BarberLogin />} />
              <Route path="/barber/dashboard" element={<BarberDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

import { useEffect, useState } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  LogOut,
  LayoutDashboard,
  UserCheck,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/dashboard/appointments', icon: Calendar, label: 'Agendamentos' },
  { to: '/admin/dashboard/barbers', icon: UserCheck, label: 'Barbeiros' },
  { to: '/admin/dashboard/accounts', icon: Users, label: 'Contas' },
  { to: '/admin/dashboard/services', icon: Scissors, label: 'Serviços' },
  { to: '/admin/dashboard/clients', icon: Users, label: 'Clientes' },
  { to: '/admin/dashboard/settings', icon: Settings, label: 'Configurações' },
];

interface NavContentProps {
  onItemClick?: () => void;
  onSignOut: () => void;
}

const NavContent = ({ onItemClick, onSignOut }: NavContentProps) => (
  <>
    <div className="p-6 border-b border-border">
      <Logo size="sm" />
    </div>

    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/admin/dashboard'}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )
          }
        >
          <item.icon className="w-5 h-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div className="p-4 border-t border-border">
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground hover:text-destructive"
        onClick={onSignOut}
      >
        <LogOut className="w-5 h-5 mr-3" />
        Sair
      </Button>
    </div>
  </>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - {barbershop?.name || 'Admin'}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex">
        {/* Mobile Header */}
        {isMobile && (
          <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
            <div className="flex items-center justify-between p-4">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <NavContent onItemClick={closeMenu} onSignOut={handleSignOut} />
                </SheetContent>
              </Sheet>
              <Logo size="sm" />
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 bg-card border-r border-border flex flex-col fixed h-full">
            <NavContent onSignOut={handleSignOut} />
          </aside>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-4 md:p-8",
          isMobile ? "pt-20" : "ml-64"
        )}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  LogOut,
  Clock,
  User,
  Phone,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface TodayAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_time: string;
  status: string;
  service: {
    name: string;
    duration: number;
  } | null;
}

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { user, isApprovedBarber, barberAccount, isLoading, signOut } = useAuth();
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || !isApprovedBarber)) {
      navigate('/barber/login');
    }
  }, [user, isApprovedBarber, isLoading, navigate]);

  useEffect(() => {
    if (barberAccount?.barber_id) {
      fetchTodayAppointments();
    }
  }, [barberAccount]);

  const fetchTodayAppointments = async () => {
    if (!barberAccount?.barber_id) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_phone,
        appointment_time,
        status,
        service:services(name, duration)
      `)
      .eq('barber_id', barberAccount.barber_id)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data as TodayAppointment[]);
    }
    setIsLoadingData(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/barber/login');
  };

  const openWhatsApp = (phone: string, clientName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${clientName}! Aqui é da Barbearia Elite.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Concluído</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  if (!user || !isApprovedBarber) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Painel do Barbeiro - Barbearia Elite</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div className="hidden sm:block">
                <h1 className="font-display text-lg text-foreground">
                  Olá, {barberAccount?.name?.split(' ')[0]}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-display text-foreground mb-2">
              Agendamentos de Hoje
            </h2>
            <p className="text-muted-foreground">
              {appointments.length} {appointments.length === 1 ? 'agendamento' : 'agendamentos'} para hoje
            </p>
          </div>

          {isLoadingData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Sem agendamentos para hoje
                </h3>
                <p className="text-muted-foreground">
                  Aproveite para relaxar ou organizar seus materiais!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{appointment.client_name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {appointment.appointment_time.slice(0, 5)}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(appointment.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {appointment.service && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {appointment.service.name} ({appointment.service.duration} min)
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openWhatsApp(appointment.client_phone, appointment.client_name)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`tel:${appointment.client_phone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

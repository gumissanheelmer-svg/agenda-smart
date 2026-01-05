import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Scissors, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  totalClients: number;
  activeBarbers: number;
  activeServices: number;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    weekAppointments: 0,
    monthAppointments: 0,
    totalClients: 0,
    activeBarbers: 0,
    activeServices: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchDashboardData();
    }
  }, [barbershopId]);

  const fetchBarbershopId = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('barbershop_id')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (data?.barbershop_id) {
      setBarbershopId(data.barbershop_id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!barbershopId) return;
    
    setIsLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { locale: pt }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { locale: pt }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [
      todayRes,
      weekRes,
      monthRes,
      clientsRes,
      barbersRes,
      servicesRes,
      recentRes
    ] = await Promise.all([
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('barbershop_id', barbershopId).eq('appointment_date', today),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('barbershop_id', barbershopId).gte('appointment_date', weekStart).lte('appointment_date', weekEnd),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('barbershop_id', barbershopId).gte('appointment_date', monthStart).lte('appointment_date', monthEnd),
      supabase.from('appointments').select('client_phone', { count: 'exact', head: true }).eq('barbershop_id', barbershopId),
      supabase.from('barbers').select('id', { count: 'exact', head: true }).eq('barbershop_id', barbershopId).eq('active', true),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('barbershop_id', barbershopId).eq('active', true),
      supabase.from('appointments').select('*, barber:barbers(name), service:services(name)').eq('barbershop_id', barbershopId).order('created_at', { ascending: false }).limit(5),
    ]);

    setStats({
      todayAppointments: todayRes.count || 0,
      weekAppointments: weekRes.count || 0,
      monthAppointments: monthRes.count || 0,
      totalClients: clientsRes.count || 0,
      activeBarbers: barbersRes.count || 0,
      activeServices: servicesRes.count || 0,
    });

    if (recentRes.data) {
      setRecentAppointments(recentRes.data);
    }

    setIsLoading(false);
  };

  const statCards = [
    { title: 'Agendamentos Hoje', value: stats.todayAppointments, icon: Calendar, color: 'text-primary' },
    { title: 'Esta Semana', value: stats.weekAppointments, icon: Clock, color: 'text-blue-500' },
    { title: 'Este Mês', value: stats.monthAppointments, icon: Calendar, color: 'text-green-500' },
    { title: 'Barbeiros Ativos', value: stats.activeBarbers, icon: Users, color: 'text-purple-500' },
    { title: 'Serviços Ativos', value: stats.activeServices, icon: Scissors, color: 'text-orange-500' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      confirmed: 'bg-green-500/20 text-green-500',
      cancelled: 'bg-red-500/20 text-red-500',
      completed: 'bg-blue-500/20 text-blue-500',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Concluído',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!barbershopId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma barbearia associada à sua conta.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Contacte o suporte para configurar a sua barbearia.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 bg-card/80 hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Appointments */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display">Agendamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum agendamento ainda.</p>
            ) : (
              recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{apt.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.service?.name} com {apt.barber?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      {format(new Date(apt.appointment_date), "dd 'de' MMM", { locale: pt })}
                    </p>
                    <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(apt.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

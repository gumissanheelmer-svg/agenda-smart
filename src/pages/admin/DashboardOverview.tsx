import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Scissors, Clock, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardStats {
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  totalClients: number;
  activeBarbers: number;
  activeServices: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface BarberRevenue {
  name: string;
  revenue: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function DashboardOverview() {
  const { user } = useAuth();
  const { barbershop } = useAdminBarbershop();
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
  
  // Revenue states
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [barberRevenue, setBarberRevenue] = useState<BarberRevenue[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  });

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchDashboardData();
      fetchRevenueData();
      fetchBarberRevenue();
      fetchFinancialSummary();
    }
  }, [barbershopId, period]);

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

  const fetchRevenueData = async () => {
    if (!barbershopId) return;

    let startDate: Date;
    let dateFormat: string;

    switch (period) {
      case 'daily':
        startDate = subDays(new Date(), 7);
        dateFormat = 'dd/MM';
        break;
      case 'weekly':
        startDate = subDays(new Date(), 28);
        dateFormat = 'dd/MM';
        break;
      case 'monthly':
        startDate = subMonths(new Date(), 6);
        dateFormat = 'MMM';
        break;
      case 'yearly':
        startDate = startOfYear(new Date());
        dateFormat = 'MMM';
        break;
      default:
        startDate = subDays(new Date(), 7);
        dateFormat = 'dd/MM';
    }

    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_date, service_id, services(price)')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .gte('appointment_date', format(startDate, 'yyyy-MM-dd'));

    if (!appointments) {
      setRevenueData([]);
      return;
    }

    // Group by date
    const revenueByDate: Record<string, number> = {};
    appointments.forEach((apt: any) => {
      const dateKey = format(new Date(apt.appointment_date), dateFormat, { locale: pt });
      const price = apt.services?.price || 0;
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + Number(price);
    });

    const chartData = Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    setRevenueData(chartData);
  };

  const fetchBarberRevenue = async () => {
    if (!barbershopId) return;

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const { data: appointments } = await supabase
      .from('appointments')
      .select('barber_id, barbers(name), services(price)')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'completed')
      .gte('appointment_date', monthStart);

    if (!appointments) {
      setBarberRevenue([]);
      return;
    }

    // Group by barber
    const revenueByBarber: Record<string, { name: string; revenue: number }> = {};
    appointments.forEach((apt: any) => {
      const barberId = apt.barber_id;
      const barberName = apt.barbers?.name || 'Desconhecido';
      const price = apt.services?.price || 0;
      
      if (!revenueByBarber[barberId]) {
        revenueByBarber[barberId] = { name: barberName, revenue: 0 };
      }
      revenueByBarber[barberId].revenue += Number(price);
    });

    const chartData = Object.values(revenueByBarber)
      .sort((a, b) => b.revenue - a.revenue);

    setBarberRevenue(chartData);
  };

  const fetchFinancialSummary = async () => {
    if (!barbershopId) return;

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [revenueRes, expensesRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('services(price)')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'completed')
        .gte('appointment_date', monthStart)
        .lte('appointment_date', monthEnd),
      supabase
        .from('expenses')
        .select('amount')
        .eq('barbershop_id', barbershopId)
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd),
    ]);

    const totalRevenue = revenueRes.data?.reduce((sum: number, apt: any) => sum + Number(apt.services?.price || 0), 0) || 0;
    const totalExpenses = expensesRes.data?.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0) || 0;

    setFinancialSummary({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    });
  };

  const businessType = barbershop?.business_type || 'barbearia';
  const isBarbershop = businessType === 'barbearia';
  const professionalsLabel = isBarbershop ? 'Barbeiros Ativos' : 'Profissionais Ativos';
  const professionalLabel = isBarbershop ? 'Barbeiro' : 'Profissional';
  const businessLabel = isBarbershop ? 'barbearia' : 'negócio';

  const statCards = [
    { title: 'Agendamentos Hoje', value: stats.todayAppointments, icon: Calendar, color: 'text-primary' },
    { title: 'Esta Semana', value: stats.weekAppointments, icon: Clock, color: 'text-blue-500' },
    { title: 'Este Mês', value: stats.monthAppointments, icon: Calendar, color: 'text-green-500' },
    { title: professionalsLabel, value: stats.activeBarbers, icon: Users, color: 'text-purple-500' },
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { 
      style: 'currency', 
      currency: 'MZN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const barColors = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(217 91% 60%)', 'hsl(280 67% 55%)', 'hsl(32 95% 50%)'];

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
            <p className="text-muted-foreground">Bem-vindo! Configure seu {businessLabel} para começar.</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/register'}
            >
              Criar Negócio
            </Button>
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

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita do Mês</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(financialSummary.totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas do Mês</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(financialSummary.totalExpenses)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 bg-card/80 ${financialSummary.netProfit >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-2xl font-bold mt-1 ${financialSummary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(financialSummary.netProfit)}
                </p>
              </div>
              <Wallet className={`w-8 h-8 ${financialSummary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Receitas ao Longo do Tempo</CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="daily" className="text-xs">Diário</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs">Mensal</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs">Anual</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado de receita disponível para este período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Barber Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display">Receita por {professionalLabel} (Este Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {barberRevenue.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barberRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {barberRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display">Agendamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum agendamento ainda.</p>
              ) : (
                recentAppointments.slice(0, 4).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.service?.name} • {apt.barber?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground">
                        {format(new Date(apt.appointment_date), "dd/MM", { locale: pt })}
                      </p>
                      <p className="text-xs text-muted-foreground">{apt.appointment_time}</p>
                    </div>
                    <div className="ml-3">
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MessageCircle,
  UserCheck,
  UserX,
  CheckCircle,
  Check,
  X,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { pt } from 'date-fns/locale';
import { getProfessionalToClientMessage, BusinessType } from '@/lib/whatsappTemplates';
import { openWhatsApp } from '@/lib/whatsapp';

type DateFilter = 'today' | 'week' | 'all';

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service: {
    name: string;
    duration: number;
  } | null;
}

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isApprovedBarber, barberAccount, isLoading, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'pending'>('pending');
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [hasAppAccess, setHasAppAccess] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('barbearia');

  useEffect(() => {
    if (!isLoading && (!user || !isApprovedBarber)) {
      navigate('/login');
    }
  }, [user, isApprovedBarber, isLoading, navigate]);

  useEffect(() => {
    if (barberAccount?.barber_id) {
      fetchAppointments();
      fetchAttendanceStatus();
      checkAppAccess();
      fetchBusinessType();
    }
  }, [barberAccount, dateFilter]);

  const fetchAppointments = async () => {
    if (!barberAccount?.barber_id) return;
    setIsLoadingData(true);

    const today = format(new Date(), 'yyyy-MM-dd');
    const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    
    let query = supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_phone,
        appointment_date,
        appointment_time,
        status,
        service:services(name, duration)
      `)
      .eq('barber_id', barberAccount.barber_id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (dateFilter === 'today') {
      query = query.eq('appointment_date', today);
    } else if (dateFilter === 'week') {
      query = query.gte('appointment_date', today).lte('appointment_date', weekEnd);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data as Appointment[]);
    }
    setIsLoadingData(false);
  };

  const fetchAttendanceStatus = async () => {
    if (!barberAccount?.barber_id || !barberAccount?.barbershop_id) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('professional_attendance')
      .select('status')
      .eq('barber_id', barberAccount.barber_id)
      .eq('attendance_date', today)
      .maybeSingle();
    
    if (data?.status) {
      setAttendanceStatus(data.status as 'present' | 'absent' | 'pending');
    } else {
      setAttendanceStatus('pending');
    }
  };

  const checkAppAccess = async () => {
    if (!barberAccount?.barber_id) return;
    
    const { data } = await supabase
      .from('barbers')
      .select('has_app_access')
      .eq('id', barberAccount.barber_id)
      .maybeSingle();
    
    setHasAppAccess(data?.has_app_access ?? true);
  };

  const fetchBusinessType = async () => {
    if (!barberAccount?.barbershop_id) return;
    
    const { data } = await supabase
      .from('barbershops')
      .select('business_type')
      .eq('id', barberAccount.barbershop_id)
      .maybeSingle();
    
    if (data?.business_type) {
      setBusinessType(data.business_type as BusinessType);
    }
  };

  const markAttendance = async (status: 'present' | 'absent') => {
    if (!barberAccount?.barber_id || !barberAccount?.barbershop_id || !hasAppAccess) return;
    
    setIsMarkingAttendance(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const { error } = await supabase
      .from('professional_attendance')
      .upsert({
        barber_id: barberAccount.barber_id,
        barbershop_id: barberAccount.barbershop_id,
        attendance_date: today,
        status,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }, { 
        onConflict: 'barber_id,attendance_date' 
      });

    if (!error) {
      setAttendanceStatus(status);
    }
    setIsMarkingAttendance(false);
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'hoje';
      case 'week': return 'esta semana';
      case 'all': return 'no total';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleOpenWhatsApp = (phone: string, clientName: string) => {
    const message = getProfessionalToClientMessage(clientName, businessType as BusinessType);
    const opened = openWhatsApp(phone, message);
    if (!opened) {
      toast({
        title: 'Número inválido',
        description: 'Número de WhatsApp inválido. Verifique e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    setUpdatingStatus(appointmentId);
    
    const { data, error } = await supabase
      .rpc('rpc_update_appointment_status', {
        p_appointment_id: appointmentId,
        p_new_status: newStatus
      });

    const result = data as { success: boolean; error?: string } | null;

    if (error || (result && !result.success)) {
      toast({
        title: 'Erro',
        description: result?.error || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso.',
      });
      fetchAppointments();
    }
    
    setUpdatingStatus(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Em Atendimento</Badge>;
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
        <title>Painel do Profissional - Sistema de Agendamento</title>
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
          {/* Attendance Card */}
          {hasAppAccess && (
            <Card className={cn(
              "mb-6 border",
              attendanceStatus === 'present' ? 'border-green-500/30 bg-green-500/5' :
              attendanceStatus === 'absent' ? 'border-red-500/30 bg-red-500/5' :
              'border-yellow-500/30 bg-yellow-500/5'
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  {attendanceStatus === 'present' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {attendanceStatus === 'absent' && <UserX className="w-5 h-5 text-red-500" />}
                  {attendanceStatus === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
                  Meu Dia de Trabalho
                </CardTitle>
                <CardDescription>
                  {attendanceStatus === 'present' && 'Você está marcado como presente hoje.'}
                  {attendanceStatus === 'absent' && 'Você está marcado como ausente hoje.'}
                  {attendanceStatus === 'pending' && 'Marque sua presença para começar o dia.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button
                  variant={attendanceStatus === 'present' ? 'default' : 'outline'}
                  className={attendanceStatus === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                  onClick={() => markAttendance('present')}
                  disabled={isMarkingAttendance}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Presente
                </Button>
                <Button
                  variant={attendanceStatus === 'absent' ? 'destructive' : 'outline'}
                  onClick={() => markAttendance('absent')}
                  disabled={isMarkingAttendance}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Ausente
                </Button>
              </CardContent>
            </Card>
          )}
          
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-display text-foreground mb-1">
                  Agendamentos
                </h2>
                <p className="text-muted-foreground">
                  {appointments.length} {appointments.length === 1 ? 'agendamento' : 'agendamentos'} {getFilterLabel()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={dateFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('today')}
                >
                  Hoje
                </Button>
                <Button
                  variant={dateFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('week')}
                >
                  Semana
                </Button>
                <Button
                  variant={dateFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('all')}
                >
                  Todos
                </Button>
              </div>
            </div>
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
                            {dateFilter !== 'today' && (
                              <span>{format(new Date(appointment.appointment_date), 'dd/MM')} - </span>
                            )}
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
                    
                    {/* Status action buttons */}
                    {appointment.status === 'pending' && (
                      <div className="flex gap-2 mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          disabled={updatingStatus === appointment.id}
                          className="flex-1 text-green-500 border-green-500/50 hover:bg-green-500/10"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          disabled={updatingStatus === appointment.id}
                          className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Botão único: Concluir para todos os tipos de negócio */}
                    {(appointment.status === 'confirmed' || appointment.status === 'in_progress') && (
                      <div className="flex gap-2 mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          disabled={updatingStatus === appointment.id}
                          className="flex-1 text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Concluir
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenWhatsApp(appointment.client_phone, appointment.client_name)}
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


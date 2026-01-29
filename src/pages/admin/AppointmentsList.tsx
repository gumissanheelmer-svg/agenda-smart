import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, Search, MessageCircle, Check, X, Filter, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { getBusinessToClientMessage, BusinessType } from '@/lib/whatsappTemplates';
import { openWhatsApp } from '@/lib/whatsapp';

interface AppointmentWithDetails {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  barber: { name: string } | null;
  service: { name: string; price: number } | null;
}

export default function AppointmentsList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const businessType = barbershop?.business_type || 'barbearia';
  const isBarbershop = businessType === 'barbearia';
  const professionalLabel = isBarbershop ? 'Barbeiro' : 'Profissional';

  // Status options based on business type
  const getStatusOptions = () => {
    if (isBarbershop) {
      return [
        { value: 'all', label: 'Todos' },
        { value: 'pending', label: 'Pendentes' },
        { value: 'confirmed', label: 'Confirmados' },
        { value: 'completed', label: 'Concluídos' },
        { value: 'cancelled', label: 'Cancelados' },
      ];
    }
    return [
      { value: 'all', label: 'Todos' },
      { value: 'pending', label: 'Pendentes' },
      { value: 'confirmed', label: 'Confirmados' },
      { value: 'in_progress', label: 'Em Atendimento' },
      { value: 'completed', label: 'Concluídos' },
      { value: 'cancelled', label: 'Cancelados' },
    ];
  };

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchAppointments();
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
    }
  };

  const fetchAppointments = async () => {
    if (!barbershopId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*, barber:barbers(name), service:services(name, price)')
      .eq('barbershop_id', barbershopId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
    } else {
      setAppointments(data || []);
    }
    setIsLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
      .rpc('rpc_update_appointment_status', { 
        p_appointment_id: id, 
        p_new_status: status 
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
  };

  const buildWhatsAppMessage = (apt: AppointmentWithDetails) => {
    return getBusinessToClientMessage(
      {
        clientName: apt.client_name,
        professionalName: apt.barber?.name || 'N/A',
        serviceName: apt.service?.name || 'N/A',
        appointmentDate: apt.appointment_date,
        appointmentTime: apt.appointment_time,
        price: apt.service?.price || 0,
      },
      businessType as BusinessType,
      professionalLabel
    );
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.client_phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      confirmed: 'bg-green-500/20 text-green-500',
      in_progress: 'bg-purple-500/20 text-purple-500',
      cancelled: 'bg-red-500/20 text-red-500',
      completed: 'bg-blue-500/20 text-blue-500',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      in_progress: 'Em Atendimento',
      cancelled: 'Cancelado',
      completed: 'Concluído',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-muted text-muted-foreground'}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Agendamentos</h1>
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-input border-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {getStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Lista de Agendamentos ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary/30 rounded-lg gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{apt.client_name}</p>
                      {getStatusBadge(apt.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{apt.client_phone}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {apt.service?.name} com {apt.barber?.name} • {apt.service?.price?.toFixed(0)} MT
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-foreground font-medium">
                      {format(new Date(apt.appointment_date), "dd 'de' MMMM", { locale: pt })}
                    </p>
                    <p className="text-sm text-muted-foreground">{apt.appointment_time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {apt.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(apt.id, 'confirmed')}
                          className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(apt.id, 'cancelled')}
                          className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {/* Botão único: Concluir para todos os tipos de negócio */}
                    {(apt.status === 'confirmed' || apt.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(apt.id, 'completed')}
                        className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Concluir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => {
                        const message = buildWhatsAppMessage(apt);
                        const opened = openWhatsApp(apt.client_phone, message);
                        if (!opened) {
                          toast({
                            title: 'Número inválido',
                            description: 'Número de WhatsApp inválido. Verifique e tente novamente.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

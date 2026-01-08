import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Calendar as CalendarIcon,
  Smartphone,
  CalendarOff,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Barber {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
  has_app_access: boolean;
}

interface Attendance {
  id: string;
  barber_id: string;
  status: 'present' | 'absent' | 'pending';
  marked_at: string;
}

interface TimeOff {
  id: string;
  barber_id: string;
  off_date: string;
  reason: string | null;
}

export default function AttendanceManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({});
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [selectedBarberForTimeOff, setSelectedBarberForTimeOff] = useState<Barber | null>(null);
  const [timeOffDate, setTimeOffDate] = useState<Date | undefined>(undefined);
  const [timeOffReason, setTimeOffReason] = useState('');

  const businessType = barbershop?.business_type || 'barbearia';
  const isBarbershop = businessType === 'barbearia';
  const professionalsLabel = isBarbershop ? 'Barbeiros' : 'Profissionais';

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchData();
    }
  }, [barbershopId, selectedDate]);

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

  const fetchData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const [barbersRes, attendancesRes, timeOffsRes] = await Promise.all([
      supabase
        .from('barbers')
        .select('id, name, specialty, active, has_app_access')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name'),
      supabase
        .from('professional_attendance')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('attendance_date', dateStr),
      supabase
        .from('professional_time_off')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('off_date', dateStr)
        .order('off_date')
    ]);

    if (barbersRes.data) {
      setBarbers(barbersRes.data);
    }

    if (attendancesRes.data) {
      const attendanceMap: Record<string, Attendance> = {};
      attendancesRes.data.forEach((a: any) => {
        attendanceMap[a.barber_id] = a;
      });
      setAttendances(attendanceMap);
    }

    if (timeOffsRes.data) {
      setTimeOffs(timeOffsRes.data);
    }

    setIsLoading(false);
  };

  const markAttendance = async (barberId: string, status: 'present' | 'absent') => {
    if (!barbershopId) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    const { error } = await supabase
      .from('professional_attendance')
      .upsert({
        barber_id: barberId,
        barbershop_id: barbershopId,
        attendance_date: dateStr,
        status,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
      }, { 
        onConflict: 'barber_id,attendance_date' 
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar a presença.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: status === 'present' ? 'Presente!' : 'Ausente',
        description: status === 'present' 
          ? 'Profissional marcado como presente.'
          : 'Profissional marcado como ausente.',
      });
      fetchData();
    }
  };

  const addTimeOff = async () => {
    if (!barbershopId || !selectedBarberForTimeOff || !timeOffDate) return;

    const { error } = await supabase
      .from('professional_time_off')
      .insert({
        barber_id: selectedBarberForTimeOff.id,
        barbershop_id: barbershopId,
        off_date: format(timeOffDate, 'yyyy-MM-dd'),
        reason: timeOffReason || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Erro',
          description: 'Já existe uma folga marcada para esta data.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível marcar a folga.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Folga marcada',
        description: `Folga de ${selectedBarberForTimeOff.name} marcada para ${format(timeOffDate, 'dd/MM/yyyy')}.`,
      });
      setTimeOffDialogOpen(false);
      setSelectedBarberForTimeOff(null);
      setTimeOffDate(undefined);
      setTimeOffReason('');
      fetchData();
    }
  };

  const removeTimeOff = async (timeOffId: string) => {
    const { error } = await supabase
      .from('professional_time_off')
      .delete()
      .eq('id', timeOffId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a folga.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Folga removida',
        description: 'A folga foi removida com sucesso.',
      });
      fetchData();
    }
  };

  const getAttendanceStatus = (barberId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const hasTimeOff = timeOffs.some(t => t.barber_id === barberId && t.off_date === dateStr);
    if (hasTimeOff) return 'time_off';
    return attendances[barberId]?.status || 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Presente</Badge>;
      case 'absent':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Ausente</Badge>;
      case 'time_off':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Folga</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
    }
  };

  const presentCount = barbers.filter(b => getAttendanceStatus(b.id) === 'present').length;
  const absentCount = barbers.filter(b => getAttendanceStatus(b.id) === 'absent').length;
  const pendingCount = barbers.filter(b => getAttendanceStatus(b.id) === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Controle de Presença</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a presença diária dos {professionalsLabel.toLowerCase()}
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-fit">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, "dd 'de' MMMM", { locale: pt })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={pt}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <UserCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-500">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Presentes</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <UserX className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-500">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Ausentes</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Professionals List */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display">
            {professionalsLabel} - {format(selectedDate, "EEEE, d 'de' MMMM", { locale: pt })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : barbers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum profissional ativo encontrado.
            </p>
          ) : (
            <div className="space-y-4">
              {barbers.map((barber) => {
                const status = getAttendanceStatus(barber.id);
                const isTimeOff = status === 'time_off';
                
                return (
                  <div 
                    key={barber.id} 
                    className={`p-4 rounded-lg border ${
                      status === 'present' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : status === 'absent'
                        ? 'bg-red-500/5 border-red-500/20'
                        : status === 'time_off'
                        ? 'bg-muted/30 border-border/50'
                        : 'bg-yellow-500/5 border-yellow-500/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          status === 'present' 
                            ? 'bg-green-500/20' 
                            : status === 'absent'
                            ? 'bg-red-500/20'
                            : status === 'time_off'
                            ? 'bg-muted'
                            : 'bg-yellow-500/20'
                        }`}>
                          {status === 'present' && <UserCheck className="w-6 h-6 text-green-500" />}
                          {status === 'absent' && <UserX className="w-6 h-6 text-red-500" />}
                          {status === 'time_off' && <CalendarOff className="w-6 h-6 text-muted-foreground" />}
                          {status === 'pending' && <Clock className="w-6 h-6 text-yellow-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{barber.name}</p>
                            {!barber.has_app_access && (
                              <Smartphone className="w-4 h-4 text-muted-foreground opacity-50" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {barber.specialty || 'Sem especialidade'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        
                        {!isTimeOff && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              className={status === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                              onClick={() => markAttendance(barber.id, 'present')}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={status === 'absent' ? 'destructive' : 'outline'}
                              onClick={() => markAttendance(barber.id, 'absent')}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBarberForTimeOff(barber);
                            setTimeOffDialogOpen(true);
                          }}
                        >
                          <CalendarOff className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Time Offs */}
      {timeOffs.length > 0 && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-muted-foreground" />
              Folgas Agendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeOffs.map((timeOff) => {
                const barber = barbers.find(b => b.id === timeOff.barber_id);
                return (
                  <div 
                    key={timeOff.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{barber?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(timeOff.off_date), "dd 'de' MMMM", { locale: pt })}
                        {timeOff.reason && ` - ${timeOff.reason}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeTimeOff(timeOff.id)}
                    >
                      Remover
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Off Dialog */}
      <Dialog open={timeOffDialogOpen} onOpenChange={setTimeOffDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              Marcar Folga - {selectedBarberForTimeOff?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data da Folga</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {timeOffDate 
                      ? format(timeOffDate, 'dd/MM/yyyy')
                      : 'Selecione a data'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={timeOffDate}
                    onSelect={setTimeOffDate}
                    locale={pt}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                value={timeOffReason}
                onChange={(e) => setTimeOffReason(e.target.value)}
                placeholder="Ex: Consulta médica, viagem..."
                className="bg-input border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeOffDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={addTimeOff} disabled={!timeOffDate}>
              Marcar Folga
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

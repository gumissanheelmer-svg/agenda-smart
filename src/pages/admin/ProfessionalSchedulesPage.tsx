import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save, User, Calendar, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Barber {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
}

interface DaySchedule {
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
}

interface ProfessionalSchedule {
  [dayOfWeek: number]: DaySchedule;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
];

const DEFAULT_SCHEDULE: DaySchedule = {
  is_working_day: true,
  start_time: '09:00',
  end_time: '18:00',
  break_start: '',
  break_end: '',
};

export default function ProfessionalSchedulesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ProfessionalSchedule>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

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

  const fetchData = async () => {
    if (!barbershopId) return;
    setIsLoading(true);

    const [barbersRes, schedulesRes] = await Promise.all([
      supabase
        .from('barbers')
        .select('id, name, specialty, active')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name'),
      supabase
        .from('professional_schedules')
        .select('*')
        .eq('barbershop_id', barbershopId)
    ]);

    if (barbersRes.data) {
      setBarbers(barbersRes.data);
    }

    if (schedulesRes.data) {
      const scheduleMap: Record<string, ProfessionalSchedule> = {};
      schedulesRes.data.forEach((s: any) => {
        if (!scheduleMap[s.barber_id]) {
          scheduleMap[s.barber_id] = {};
        }
        scheduleMap[s.barber_id][s.day_of_week] = {
          is_working_day: s.is_working_day,
          start_time: s.start_time || '09:00',
          end_time: s.end_time || '18:00',
          break_start: s.break_start || '',
          break_end: s.break_end || '',
        };
      });
      setSchedules(scheduleMap);
    }

    setIsLoading(false);
  };

  const getScheduleForDay = (barberId: string, dayOfWeek: number): DaySchedule => {
    return schedules[barberId]?.[dayOfWeek] || { 
      ...DEFAULT_SCHEDULE, 
      is_working_day: dayOfWeek !== 0 // Sunday off by default
    };
  };

  const updateSchedule = (barberId: string, dayOfWeek: number, updates: Partial<DaySchedule>) => {
    setSchedules(prev => ({
      ...prev,
      [barberId]: {
        ...prev[barberId],
        [dayOfWeek]: {
          ...getScheduleForDay(barberId, dayOfWeek),
          ...updates,
        }
      }
    }));
  };

  const saveSchedule = async (barberId: string) => {
    if (!barbershopId) return;
    setIsSaving(barberId);

    try {
      const barberSchedules = schedules[barberId] || {};
      
      // Prepare all days
      const scheduleData = DAYS_OF_WEEK.map(day => {
        const schedule = barberSchedules[day.value] || getScheduleForDay(barberId, day.value);
        return {
          barber_id: barberId,
          barbershop_id: barbershopId,
          day_of_week: day.value,
          is_working_day: schedule.is_working_day,
          start_time: schedule.start_time || null,
          end_time: schedule.end_time || null,
          break_start: schedule.break_start || null,
          break_end: schedule.break_end || null,
        };
      });

      // Upsert all schedules
      const { error } = await supabase
        .from('professional_schedules')
        .upsert(scheduleData, { 
          onConflict: 'barber_id,day_of_week',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Horários salvos com sucesso!',
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os horários.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(null);
    }
  };

  const getWorkDaysSummary = (barberId: string) => {
    const workDays = DAYS_OF_WEEK.filter(day => 
      getScheduleForDay(barberId, day.value).is_working_day
    );
    return workDays.map(d => d.short).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Horários de Trabalho</h1>
          <p className="text-muted-foreground mt-1">
            Configure os horários de cada {professionalsLabel.toLowerCase()}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : barbers.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum profissional ativo encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {barbers.map((barber) => (
            <AccordionItem 
              key={barber.id} 
              value={barber.id}
              className="border border-border/50 rounded-lg bg-card/80 px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{barber.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {barber.specialty || 'Sem especialidade'} • {getWorkDaysSummary(barber.id)}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => {
                    const schedule = getScheduleForDay(barber.id, day.value);
                    return (
                      <div 
                        key={day.value} 
                        className={`p-4 rounded-lg border ${
                          schedule.is_working_day 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : 'bg-muted/30 border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Calendar className={`w-4 h-4 ${
                              schedule.is_working_day ? 'text-green-500' : 'text-muted-foreground'
                            }`} />
                            <span className={`font-medium ${
                              schedule.is_working_day ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {day.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">
                              {schedule.is_working_day ? 'Trabalha' : 'Folga'}
                            </Label>
                            <Switch
                              checked={schedule.is_working_day}
                              onCheckedChange={(checked) => 
                                updateSchedule(barber.id, day.value, { is_working_day: checked })
                              }
                            />
                          </div>
                        </div>

                        {schedule.is_working_day && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Entrada
                              </Label>
                              <Input
                                type="time"
                                value={schedule.start_time}
                                onChange={(e) => 
                                  updateSchedule(barber.id, day.value, { start_time: e.target.value })
                                }
                                className="bg-input border-border"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Saída
                              </Label>
                              <Input
                                type="time"
                                value={schedule.end_time}
                                onChange={(e) => 
                                  updateSchedule(barber.id, day.value, { end_time: e.target.value })
                                }
                                className="bg-input border-border"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Coffee className="w-3 h-3" /> Início Pausa
                              </Label>
                              <Input
                                type="time"
                                value={schedule.break_start}
                                onChange={(e) => 
                                  updateSchedule(barber.id, day.value, { break_start: e.target.value })
                                }
                                className="bg-input border-border"
                                placeholder="Opcional"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs flex items-center gap-1">
                                <Coffee className="w-3 h-3" /> Fim Pausa
                              </Label>
                              <Input
                                type="time"
                                value={schedule.break_end}
                                onChange={(e) => 
                                  updateSchedule(barber.id, day.value, { break_end: e.target.value })
                                }
                                className="bg-input border-border"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button 
                    variant="gold" 
                    className="w-full"
                    onClick={() => saveSchedule(barber.id)}
                    disabled={isSaving === barber.id}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving === barber.id ? 'Salvando...' : 'Salvar Horários'}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

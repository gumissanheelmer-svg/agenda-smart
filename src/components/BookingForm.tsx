import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Service, Barber, Appointment, WorkingHours } from '@/lib/types';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Phone, Scissors, Check, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBarbershop } from '@/hooks/useBarbershop';

interface BookingFormProps {
  onBack: () => void;
  barbershopId?: string;
}

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// Validação de telefone moçambicano (84, 85, 86, 87, 82, 83)
const validateMozambicanPhone = (phone: string): { isValid: boolean; formatted: string; error?: string } => {
  // Remove todos os caracteres não numéricos
  const digits = phone.replace(/\D/g, '');
  
  // Verifica se começa com 258 (código do país)
  let localNumber = digits;
  if (digits.startsWith('258')) {
    localNumber = digits.slice(3);
  }
  
  // Deve ter exatamente 9 dígitos
  if (localNumber.length !== 9) {
    return { 
      isValid: false, 
      formatted: phone,
      error: 'O número deve ter 9 dígitos (ex: 84 000 0000)'
    };
  }
  
  // Deve começar com 82, 83, 84, 85, 86 ou 87 (operadoras moçambicanas)
  const validPrefixes = ['82', '83', '84', '85', '86', '87'];
  const prefix = localNumber.slice(0, 2);
  
  if (!validPrefixes.includes(prefix)) {
    return { 
      isValid: false, 
      formatted: phone,
      error: 'Número inválido. Use um número Vodacom (84/85), Movitel (86/87) ou Tmcel (82/83)'
    };
  }
  
  // Formata o número com código do país
  const formatted = `+258${localNumber}`;
  return { isValid: true, formatted };
};

export function BookingForm({ onBack, barbershopId }: BookingFormProps) {
  const { toast } = useToast();
  const { barbershop } = useBarbershop();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('+258840000000');
  const [phoneError, setPhoneError] = useState<string>('');

  // Use barbershopId from props or from context
  const currentBarbershopId = barbershopId || barbershop?.id;

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    barberId: '',
    appointmentDate: undefined as Date | undefined,
    appointmentTime: '',
  });

  useEffect(() => {
    if (currentBarbershopId) {
      fetchData();
    }
  }, [currentBarbershopId]);

  useEffect(() => {
    if (formData.barberId && formData.appointmentDate) {
      fetchAppointmentsForDay();
    }
  }, [formData.barberId, formData.appointmentDate]);

  const fetchData = async () => {
    if (!currentBarbershopId) return;

    const [servicesRes, barbersRes] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).eq('barbershop_id', currentBarbershopId),
      supabase.from('barbers').select('*').eq('active', true).eq('barbershop_id', currentBarbershopId),
    ]);

    if (servicesRes.data) setServices(servicesRes.data as Service[]);
    if (barbersRes.data) {
      const mappedBarbers = barbersRes.data.map(b => ({
        ...b,
        working_hours: b.working_hours as unknown as WorkingHours
      }));
      setBarbers(mappedBarbers);
    }
    
    // Get whatsapp from barbershop
    if (barbershop?.whatsapp_number) {
      setWhatsappNumber(barbershop.whatsapp_number);
    }
  };

  const fetchAppointmentsForDay = async () => {
    if (!formData.appointmentDate || !currentBarbershopId) return;

    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('barber_id', formData.barberId)
      .eq('appointment_date', format(formData.appointmentDate, 'yyyy-MM-dd'))
      .eq('barbershop_id', currentBarbershopId)
      .neq('status', 'cancelled');

    if (data) {
      const mappedAppointments = data.map(a => ({
        ...a,
        status: a.status as AppointmentStatus
      }));
      setExistingAppointments(mappedAppointments);
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const selectedBarber = barbers.find(b => b.id === formData.barberId);
    
    if (!selectedBarber || !formData.appointmentDate) return slots;

    const dayOfWeek = format(formData.appointmentDate, 'EEEE').toLowerCase() as keyof WorkingHours;
    const dayHours = selectedBarber.working_hours[dayOfWeek];
    
    if (!dayHours) return slots;

    const [startHour, startMin] = dayHours.start.split(':').map(Number);
    const [endHour, endMin] = dayHours.end.split(':').map(Number);

    const selectedService = services.find(s => s.id === formData.serviceId);
    const serviceDuration = selectedService?.duration || 30;

    const bookedTimes = existingAppointments.map(a => a.appointment_time);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        if (hour === startHour && min < startMin) continue;
        if (hour === endHour - 1 && min + serviceDuration > 60 - endMin) continue;

        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        if (!bookedTimes.includes(timeStr)) {
          slots.push(timeStr);
        }
      }
    }

    return slots;
  };

  const handleSubmit = async () => {
    if (!formData.clientName || !formData.clientPhone || !formData.serviceId || 
        !formData.barberId || !formData.appointmentDate || !formData.appointmentTime || !currentBarbershopId) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_name: formData.clientName.trim(),
          client_phone: formData.clientPhone.trim(),
          service_id: formData.serviceId,
          barber_id: formData.barberId,
          appointment_date: format(formData.appointmentDate, 'yyyy-MM-dd'),
          appointment_time: formData.appointmentTime,
          status: 'pending',
          barbershop_id: currentBarbershopId,
        })
        .select('*')
        .single();

      if (error) throw error;

      const mappedAppointment: Appointment = {
        ...data,
        notes: data.notes || null,
        status: data.status as AppointmentStatus
      };
      
      setCreatedAppointment(mappedAppointment);
      setIsSuccess(true);

      toast({
        title: 'Agendamento realizado!',
        description: 'Seu horário foi reservado com sucesso.',
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Erro ao agendar',
        description: 'Não foi possível realizar o agendamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!createdAppointment) return '#';

    const barberName = barbers.find(b => b.id === createdAppointment.barber_id)?.name || 'N/A';
    const service = services.find(s => s.id === createdAppointment.service_id);
    const serviceName = service?.name || 'N/A';
    const servicePrice = service?.price || 0;
    const formattedDate = format(new Date(createdAppointment.appointment_date), 'dd/MM/yyyy');
    const barbershopName = barbershop?.name || 'Barbearia';

    const message = encodeURIComponent(
      `Olá! Fiz um agendamento na ${barbershopName}\n\n` +
      `👤 Cliente: ${createdAppointment.client_name}\n` +
      `✂️ Barbeiro: ${barberName}\n` +
      `💈 Serviço: ${serviceName}\n` +
      `📅 Data: ${formattedDate}\n` +
      `⏰ Hora: ${createdAppointment.appointment_time}\n` +
      `💰 Valor: ${servicePrice.toFixed(0)} MZN\n\n` +
      `Aguardo confirmação! 🙏`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  if (isSuccess && createdAppointment) {
    const barberName = barbers.find(b => b.id === createdAppointment.barber_id)?.name;
    const serviceName = services.find(s => s.id === createdAppointment.service_id)?.name;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur animate-scale-in">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso.
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="text-foreground font-medium">{serviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barbeiro:</span>
                <span className="text-foreground font-medium">{barberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="text-foreground font-medium">
                  {format(new Date(createdAppointment.appointment_date), "dd 'de' MMMM", { locale: pt })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="text-foreground font-medium">{createdAppointment.appointment_time}</span>
              </div>
            </div>

            <a 
              href={getWhatsAppLink()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="gold" size="lg" className="w-full mb-4">
                <MessageCircle className="w-5 h-5 mr-2" />
                Enviar confirmação pelo WhatsApp
              </Button>
            </a>

            <Button variant="outline" className="w-full" onClick={onBack}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          ← Voltar
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-8 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Client Info */}
        {step === 1 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Seus dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Digite seu nome"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    placeholder="84 000 0000"
                    value={formData.clientPhone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, clientPhone: value });
                      if (value.replace(/\D/g, '').length >= 9) {
                        const validation = validateMozambicanPhone(value);
                        setPhoneError(validation.error || '');
                      } else {
                        setPhoneError('');
                      }
                    }}
                    onBlur={() => {
                      if (formData.clientPhone) {
                        const validation = validateMozambicanPhone(formData.clientPhone);
                        setPhoneError(validation.error || '');
                        if (validation.isValid) {
                          setFormData({ ...formData, clientPhone: validation.formatted });
                        }
                      }
                    }}
                    className={`bg-input border-border ${phoneError ? 'border-destructive' : ''}`}
                  />
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Formato: 84/85/86/87/82/83 seguido de 7 dígitos
                </p>
              </div>

              <Button
                variant="gold"
                className="w-full mt-4"
                onClick={() => {
                  const validation = validateMozambicanPhone(formData.clientPhone);
                  if (!validation.isValid) {
                    setPhoneError(validation.error || 'Número inválido');
                    return;
                  }
                  setFormData({ ...formData, clientPhone: validation.formatted });
                  setStep(2);
                }}
                disabled={!formData.clientName || !formData.clientPhone}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Service & Barber */}
        {step === 2 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                Escolha o serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{service.name}</span>
                          <span className="text-muted-foreground ml-4">
                            {service.price.toFixed(0)} MT • {service.duration}min
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Barbeiro</Label>
                <Select
                  value={formData.barberId}
                  onValueChange={(value) => setFormData({ ...formData, barberId: value })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Selecione um barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!formData.serviceId || !formData.barberId}
                >
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Escolha a data e horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={formData.appointmentDate}
                    onSelect={(date) => setFormData({ ...formData, appointmentDate: date, appointmentTime: '' })}
                    disabled={(date) => isBefore(date, startOfDay(new Date())) || isBefore(date, addDays(new Date(), -1))}
                    locale={pt}
                    className="rounded-md border border-border bg-card"
                  />
                </div>
              </div>

              {formData.appointmentDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Horário disponível
                  </Label>
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum horário disponível nesta data.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={formData.appointmentTime === time ? 'gold' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, appointmentTime: time })}
                          className="text-sm"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!formData.appointmentDate || !formData.appointmentTime || isLoading}
                >
                  {isLoading ? 'Agendando...' : 'Confirmar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

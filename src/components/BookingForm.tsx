import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { WorkingHours } from '@/lib/types';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Phone, Scissors, Check, MessageCircle, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useBusinessType } from '@/hooks/useBusinessType';

interface BookingFormProps {
  onBack: () => void;
  barbershopId?: string;
}

interface ServiceData {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ProfessionalData {
  id: string;
  name: string;
  specialty: string | null;
  working_hours: WorkingHours;
}

interface ExistingAppointment {
  id: string;
  appointment_time: string;
  service_id: string;
}

// Validação de telefone moçambicano (84, 85, 86, 87, 82, 83)
const validateMozambicanPhone = (phone: string): { isValid: boolean; formatted: string; error?: string } => {
  const digits = phone.replace(/\D/g, '');
  
  let localNumber = digits;
  if (digits.startsWith('258')) {
    localNumber = digits.slice(3);
  }
  
  if (localNumber.length !== 9) {
    return { 
      isValid: false, 
      formatted: phone,
      error: 'O número deve ter 9 dígitos (ex: 84 000 0000)'
    };
  }
  
  const validPrefixes = ['82', '83', '84', '85', '86', '87'];
  const prefix = localNumber.slice(0, 2);
  
  if (!validPrefixes.includes(prefix)) {
    return { 
      isValid: false, 
      formatted: phone,
      error: 'Número inválido. Use um número Vodacom (84/85), Movitel (86/87) ou Tmcel (82/83)'
    };
  }
  
  const formatted = `+258${localNumber}`;
  return { isValid: true, formatted };
};

export function BookingForm({ onBack, barbershopId }: BookingFormProps) {
  const { toast } = useToast();
  const { barbershop } = useBarbershop();
  const { professionalLabel, isBarbershop } = useBusinessType();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('+258840000000');
  const [phoneError, setPhoneError] = useState<string>('');
  const [bookingError, setBookingError] = useState<string>('');

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
      fetchServices();
    }
  }, [currentBarbershopId]);

  useEffect(() => {
    if (formData.serviceId && currentBarbershopId) {
      fetchProfessionalsForService();
      // Reset profissional selecionado quando o serviço muda
      setFormData(prev => ({ ...prev, barberId: '', appointmentTime: '' }));
      setProfessionals([]);
    }
  }, [formData.serviceId]);

  useEffect(() => {
    if (formData.barberId && formData.appointmentDate) {
      fetchAppointmentsForDay();
    }
  }, [formData.barberId, formData.appointmentDate]);

  const fetchServices = async () => {
    if (!currentBarbershopId) return;

    // Usar a nova função RPC que valida o tipo de negócio
    const { data, error } = await supabase.rpc('get_valid_services', { 
      p_barbershop_id: currentBarbershopId 
    });

    if (error) {
      console.error('Error fetching services:', error);
      // Fallback para método antigo
      const fallbackRes = await supabase.rpc('get_public_services', { 
        p_barbershop_id: currentBarbershopId 
      });
      if (fallbackRes.data) {
        setServices(fallbackRes.data as ServiceData[]);
      }
    } else if (data) {
      setServices(data as ServiceData[]);
    }
    
    if (barbershop?.whatsapp_number) {
      setWhatsappNumber(barbershop.whatsapp_number);
    }
  };

  const fetchProfessionalsForService = async () => {
    if (!formData.serviceId || !currentBarbershopId) return;

    // Usar a nova função RPC que busca profissionais por serviço
    const { data, error } = await supabase.rpc('get_professionals_for_service', { 
      p_service_id: formData.serviceId,
      p_barbershop_id: currentBarbershopId 
    });

    if (error) {
      console.error('Error fetching professionals:', error);
      // Fallback para método antigo
      const fallbackRes = await supabase.rpc('get_public_barbers', { 
        p_barbershop_id: currentBarbershopId 
      });
      if (fallbackRes.data) {
        const mapped = (fallbackRes.data as any[]).map(b => ({
          id: b.id,
          name: b.name,
          specialty: null,
          working_hours: b.working_hours as WorkingHours,
        }));
        setProfessionals(mapped);
      }
    } else if (data) {
      const mapped = (data as any[]).map(b => ({
        id: b.id,
        name: b.name,
        specialty: b.specialty,
        working_hours: b.working_hours as WorkingHours,
      }));
      setProfessionals(mapped);
    }
  };

  const fetchAppointmentsForDay = async () => {
    if (!formData.appointmentDate || !currentBarbershopId) return;

    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_time, service_id')
      .eq('barber_id', formData.barberId)
      .eq('appointment_date', format(formData.appointmentDate, 'yyyy-MM-dd'))
      .eq('barbershop_id', currentBarbershopId)
      .neq('status', 'cancelled');

    if (data) {
      setExistingAppointments(data);
    }
  };

  const generateTimeSlots = () => {
    const slots: string[] = [];
    const selectedProfessional = professionals.find(p => p.id === formData.barberId);
    
    if (!selectedProfessional || !formData.appointmentDate) return slots;

    const dayOfWeek = format(formData.appointmentDate, 'EEEE').toLowerCase() as keyof WorkingHours;
    const dayHours = selectedProfessional.working_hours?.[dayOfWeek];
    
    if (!dayHours) return slots;

    const [startHour, startMin] = dayHours.start.split(':').map(Number);
    const [endHour, endMin] = dayHours.end.split(':').map(Number);

    const selectedService = services.find(s => s.id === formData.serviceId);
    const serviceDuration = selectedService?.duration || 30;

    // Criar mapa de horários ocupados com suas durações
    const occupiedSlots: { start: number; end: number }[] = [];
    existingAppointments.forEach(apt => {
      const [h, m] = apt.appointment_time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      // Buscar duração do serviço agendado (assumir 30 min se não encontrar)
      const aptService = services.find(s => s.id === apt.service_id);
      const aptDuration = aptService?.duration || 30;
      occupiedSlots.push({ start: startMinutes, end: startMinutes + aptDuration });
    });

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += 30) {
        if (hour === startHour && min < startMin) continue;
        
        const slotStartMinutes = hour * 60 + min;
        const slotEndMinutes = slotStartMinutes + serviceDuration;
        
        // Verificar se o slot ultrapassa o horário de fechamento
        const closeMinutes = endHour * 60 + endMin;
        if (slotEndMinutes > closeMinutes) continue;

        // Verificar se o slot colide com algum agendamento existente
        const hasConflict = occupiedSlots.some(occupied => 
          (slotStartMinutes < occupied.end && slotEndMinutes > occupied.start)
        );

        if (!hasConflict) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
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
    setBookingError('');

    const appointmentData = {
      client_name: formData.clientName.trim(),
      client_phone: formData.clientPhone.trim(),
      service_id: formData.serviceId,
      barber_id: formData.barberId,
      appointment_date: format(formData.appointmentDate, 'yyyy-MM-dd'),
      appointment_time: formData.appointmentTime,
      status: 'pending',
      barbershop_id: currentBarbershopId,
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select('*')
        .single();

      if (error) {
        console.error('Booking error:', error);
        
        // Extrair mensagem de erro amigável
        let errorMessage = 'Não foi possível realizar o agendamento.';
        if (error.message) {
          if (error.message.includes('Horário indisponível')) {
            errorMessage = 'Este horário não está mais disponível. Por favor, escolha outro horário.';
          } else if (error.message.includes('profissional não realiza')) {
            errorMessage = 'Este profissional não realiza o serviço selecionado.';
          } else if (error.message.includes('Serviço não encontrado')) {
            errorMessage = 'Serviço não disponível. Por favor, selecione outro.';
          } else if (error.message.includes('Profissional não encontrado')) {
            errorMessage = 'Profissional não disponível. Por favor, selecione outro.';
          } else if (error.message.includes('Estabelecimento')) {
            errorMessage = 'Estabelecimento temporariamente indisponível.';
          } else {
            errorMessage = error.message;
          }
        }
        
        setBookingError(errorMessage);
        toast({
          title: 'Erro ao agendar',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      setCreatedAppointment(data);
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

    const professionalName = professionals.find(p => p.id === createdAppointment.barber_id)?.name || 'N/A';
    const service = services.find(s => s.id === createdAppointment.service_id);
    const serviceName = service?.name || 'N/A';
    const servicePrice = service?.price || 0;
    const formattedDate = format(new Date(createdAppointment.appointment_date), 'dd/MM/yyyy');
    const barbershopName = barbershop?.name || 'Estabelecimento';

    const message = encodeURIComponent(
      `Olá! Fiz um agendamento na ${barbershopName}\n\n` +
      `👤 Cliente: ${createdAppointment.client_name}\n` +
      `👩‍💼 ${professionalLabel}: ${professionalName}\n` +
      `💇‍♀️ Serviço: ${serviceName}\n` +
      `📅 Data: ${formattedDate}\n` +
      `⏰ Hora: ${createdAppointment.appointment_time}\n` +
      `💰 Valor: ${servicePrice.toFixed(0)} MZN\n\n` +
      `Aguardo confirmação! 🙏`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${message}`;
  };

  if (isSuccess && createdAppointment) {
    const professionalName = professionals.find(p => p.id === createdAppointment.barber_id)?.name;
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
                <span className="text-muted-foreground">{professionalLabel}:</span>
                <span className="text-foreground font-medium">{professionalName}</span>
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
  const ServiceIcon = isBarbershop ? Scissors : Sparkles;

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

        {/* Error message */}
        {bookingError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{bookingError}</span>
          </div>
        )}

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

        {/* Step 2: Service & Professional */}
        {step === 2 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <ServiceIcon className="w-5 h-5 text-primary" />
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
                        {service.name} - {service.price.toFixed(0)} MT ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.serviceId && (
                <div className="space-y-2">
                  <Label>{professionalLabel}</Label>
                  {professionals.length === 0 ? (
                    <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      Carregando profissionais...
                    </div>
                  ) : (
                    <Select
                      value={formData.barberId}
                      onValueChange={(value) => setFormData({ ...formData, barberId: value, appointmentTime: '' })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder={`Selecione o ${professionalLabel.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.name}
                            {professional.specialty && ` (${professional.specialty})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
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
                Data e horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Calendar
                  mode="single"
                  selected={formData.appointmentDate}
                  onSelect={(date) => setFormData({ ...formData, appointmentDate: date, appointmentTime: '' })}
                  disabled={(date) => isBefore(date, startOfDay(new Date())) || isBefore(addDays(new Date(), 30), date)}
                  className="rounded-md border bg-card"
                  locale={pt}
                />
              </div>

              {formData.appointmentDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horário disponível
                  </Label>
                  {timeSlots.length === 0 ? (
                    <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                      Nenhum horário disponível para esta data.
                      <br />
                      <span className="text-sm">Tente outra data ou profissional.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={formData.appointmentTime === time ? 'gold' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, appointmentTime: time })}
                          className="text-xs"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
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

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
import { Calendar as CalendarIcon, Clock, User, Phone, Scissors, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBarbershop } from '@/hooks/useBarbershop';
import { useBusinessType } from '@/hooks/useBusinessType';
import { ServiceGallery } from '@/components/ServiceGallery';
import { PaymentStep } from '@/components/booking/PaymentStep';
import { PaymentMethod } from '@/lib/paymentCodeExtractor';
import { generateBusinessTimeSlots, isBusinessHoursConfigured, filterAvailableSlots } from '@/lib/timeSlotUtils';

interface BookingFormProps {
  onBack: () => void;
  barbershopId?: string;
  backgroundImageUrl?: string | null;
  backgroundOverlayLevel?: 'low' | 'medium' | 'high';
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
  _duration?: number; // Duration from RPC (if available)
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

export function BookingForm({ onBack, barbershopId, backgroundImageUrl, backgroundOverlayLevel = 'medium' }: BookingFormProps) {
  const { toast } = useToast();
  const { barbershop } = useBarbershop();
  const { professionalLabel, isBarbershop } = useBusinessType();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<ProfessionalData[]>([]);
  const [serviceProfessionalMap, setServiceProfessionalMap] = useState<Map<string, string[]>>(new Map());
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [phoneError, setPhoneError] = useState<string>('');
  const [bookingError, setBookingError] = useState<string>('');
  const [dataLoaded, setDataLoaded] = useState(false);

  const currentBarbershopId = barbershopId || barbershop?.id;
  const businessType = barbershop?.business_type || 'barbearia';

  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    barberId: '',
    appointmentDate: undefined as Date | undefined,
    appointmentTime: '',
  });

  // Carregar todos os dados de uma vez (serviços, profissionais e mapeamentos)
  useEffect(() => {
    if (currentBarbershopId && !dataLoaded) {
      fetchAllData();
    }
  }, [currentBarbershopId]);

  // Filtrar profissionais quando o serviço muda (sem chamada ao servidor)
  useEffect(() => {
    if (formData.serviceId && dataLoaded) {
      filterProfessionalsForService(formData.serviceId);
      setFormData(prev => ({ ...prev, barberId: '', appointmentTime: '' }));
    }
  }, [formData.serviceId, dataLoaded]);

  useEffect(() => {
    if (formData.barberId && formData.appointmentDate) {
      fetchAppointmentsForDay();
    }
  }, [formData.barberId, formData.appointmentDate]);

  // Carregar todos os dados necessários de uma vez
  const fetchAllData = async () => {
    if (!currentBarbershopId) return;

    try {
      // Carregar serviços, profissionais e mapeamentos em paralelo
      const [servicesRes, professionalsRes, mappingsRes] = await Promise.all([
        supabase.rpc('get_valid_services', { p_barbershop_id: currentBarbershopId }),
        supabase.rpc('get_public_professionals', { p_barbershop_id: currentBarbershopId }),
        supabase.rpc('get_service_professional_mappings', { p_barbershop_id: currentBarbershopId })
      ]);

      // Processar serviços
      if (servicesRes.data) {
        setServices(servicesRes.data as ServiceData[]);
      } else if (servicesRes.error) {
        // Fallback
        const fallback = await supabase.rpc('get_public_services', { p_barbershop_id: currentBarbershopId });
        if (fallback.data) setServices(fallback.data as ServiceData[]);
      }

      // Processar profissionais
      if (professionalsRes.data) {
        const mapped = (professionalsRes.data as any[]).map(b => ({
          id: b.id,
          name: b.name,
          specialty: null,
          working_hours: b.working_hours as WorkingHours,
        }));
        setAllProfessionals(mapped);
      } else if (professionalsRes.error) {
        // Fallback
        const fallback = await supabase.rpc('get_public_barbers', { p_barbershop_id: currentBarbershopId });
        if (fallback.data) {
          const mapped = (fallback.data as any[]).map(b => ({
            id: b.id,
            name: b.name,
            specialty: null,
            working_hours: b.working_hours as WorkingHours,
          }));
          setAllProfessionals(mapped);
        }
      }

      // Processar mapeamentos serviço-profissional
      if (mappingsRes.data) {
        const map = new Map<string, string[]>();
        mappingsRes.data.forEach((m: any) => {
          const existing = map.get(m.service_id) || [];
          existing.push(m.professional_id);
          map.set(m.service_id, existing);
        });
        setServiceProfessionalMap(map);
      }

      // WhatsApp number is now fetched securely via RPC after appointment creation

      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching booking data:', error);
      setDataLoaded(true);
    }
  };

  // Filtrar profissionais localmente sem chamada ao servidor
  const filterProfessionalsForService = (serviceId: string) => {
    // Para barbearias, todos os profissionais podem executar qualquer serviço
    if (businessType === 'barbearia') {
      setProfessionals(allProfessionals);
      return;
    }

    // Para salões e mistos, usar o mapeamento
    const allowedIds = serviceProfessionalMap.get(serviceId) || [];
    if (allowedIds.length === 0) {
      // Se não há mapeamento, permitir todos (fallback)
      setProfessionals(allProfessionals);
    } else {
      const filtered = allProfessionals.filter(p => allowedIds.includes(p.id));
      setProfessionals(filtered);
    }
  };

  const fetchAppointmentsForDay = async () => {
    if (!formData.appointmentDate || !formData.barberId) return;

    try {
      // Use secure RPC to get appointments (returns only time and duration, no client data)
      const { data, error } = await supabase.rpc('get_public_appointments_for_day', {
        p_barber_id: formData.barberId,
        p_date: format(formData.appointmentDate, 'yyyy-MM-dd')
      });

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      if (data) {
        // Map to existing format for generateTimeSlots compatibility
        const mapped = data.map((apt: { appointment_time: string; service_duration: number }, index: number) => ({
          id: `temp-${index}`,
          appointment_time: apt.appointment_time,
          service_id: '', // Not needed, duration is provided
          _duration: apt.service_duration // Store duration directly
        }));
        setExistingAppointments(mapped);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  };

  const generateTimeSlots = () => {
    // Use business opening/closing times (NEVER hardcoded)
    const openingTime = barbershop?.opening_time;
    const closingTime = barbershop?.closing_time;
    
    // Validate business hours are configured
    if (!isBusinessHoursConfigured(openingTime, closingTime)) {
      return [];
    }

    // Get buffer and interval settings from business (with defaults)
    const prepBuffer = barbershop?.prep_buffer_minutes ?? 0;
    const cleanupBuffer = barbershop?.cleanup_buffer_minutes ?? 0;
    const slotInterval = barbershop?.slot_interval_minutes ?? 30;

    // Generate all possible slots based on business hours with buffers
    const allSlots = generateBusinessTimeSlots(
      openingTime, 
      closingTime, 
      slotInterval,
      prepBuffer,
      cleanupBuffer
    );

    // Get service duration
    const selectedService = services.find(s => s.id === formData.serviceId);
    const serviceDuration = selectedService?.duration || 30;

    // Map existing appointments to the format expected by filterAvailableSlots
    const appointmentsWithDuration = existingAppointments.map(apt => ({
      appointment_time: apt.appointment_time,
      duration: apt._duration || (apt.service_id ? services.find(s => s.id === apt.service_id)?.duration : 30) || 30
    }));

    // Filter out occupied slots (respecting service duration and cleanup buffer)
    return filterAvailableSlots(allSlots, appointmentsWithDuration, serviceDuration, closingTime, cleanupBuffer);
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

    try {
      // Use secure RPC function to create appointment (SECURITY DEFINER)
      const { data, error } = await supabase.rpc('create_public_appointment', {
        p_barbershop_id: currentBarbershopId,
        p_barber_id: formData.barberId,
        p_service_id: formData.serviceId,
        p_client_name: formData.clientName.trim(),
        p_client_phone: formData.clientPhone.trim(),
        p_appointment_date: format(formData.appointmentDate, 'yyyy-MM-dd'),
        p_appointment_time: formData.appointmentTime,
        p_notes: null
      });

      if (error) {
        console.error('Booking RPC error:', error);
        setBookingError('Não foi possível realizar o agendamento. Tente novamente.');
        toast({
          title: 'Erro ao agendar',
          description: 'Não foi possível realizar o agendamento. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // RPC returns jsonb with success and appointment_id or error
      const result = data as { success: boolean; appointment_id?: string; error?: string };

      if (!result.success) {
        const errorMessage = result.error || 'Não foi possível realizar o agendamento.';
        setBookingError(errorMessage);
        toast({
          title: 'Erro ao agendar',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      // Create appointment object for display
      setCreatedAppointment({
        id: result.appointment_id,
        client_name: formData.clientName.trim(),
        client_phone: formData.clientPhone.trim(),
        barber_id: formData.barberId,
        service_id: formData.serviceId,
        appointment_date: format(formData.appointmentDate, 'yyyy-MM-dd'),
        appointment_time: formData.appointmentTime,
      });
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

  if (isSuccess && createdAppointment) {
    const professionalName = professionals.find(p => p.id === createdAppointment.barber_id)?.name;
    const serviceName = services.find(s => s.id === createdAppointment.service_id)?.name;

    const overlayOpacity = {
      low: 'bg-black/30',
      medium: 'bg-black/50',
      high: 'bg-black/70',
    }[backgroundOverlayLevel];

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
        {/* Background Image */}
        {backgroundImageUrl && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
              style={{ backgroundImage: `url(${backgroundImageUrl})` }}
            />
            <div className={`absolute inset-0 ${overlayOpacity}`} />
          </>
        )}
        <Card className="relative z-10 w-full max-w-md border-border/50 bg-card/90 backdrop-blur-md animate-scale-in shadow-2xl">
          <CardContent className="pt-8 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Agendamento Realizado!
            </h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado. Aguarde confirmação.
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

  const overlayOpacity = {
    low: 'bg-black/30',
    medium: 'bg-black/50',
    high: 'bg-black/70',
  }[backgroundOverlayLevel];

  return (
    <div className="min-h-screen bg-background py-8 px-4 relative">
      {/* Background Image */}
      {backgroundImageUrl && (
        <>
          <div 
            className="fixed inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          />
          <div className={`fixed inset-0 ${overlayOpacity}`} />
        </>
      )}
      <div className="max-w-lg mx-auto relative z-10">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          ← Voltar
        </Button>

        {/* Progress indicator - show 4 steps if payment is required */}
        {(() => {
          const hasPayment = barbershop?.payment_required || false;
          const totalSteps = hasPayment ? 4 : 3;
          return (
            <div className="flex items-center justify-center gap-2 mb-8">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-primary' : s < step ? 'w-8 bg-primary/50' : 'w-8 bg-muted'
                  }`}
                />
              ))}
            </div>
          );
        })()}

        {/* Error message */}
        {bookingError && (
          <div className="mb-4 p-4 bg-destructive/20 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive backdrop-blur-md shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{bookingError}</span>
          </div>
        )}

        {/* Step 1: Client Info */}
        {step === 1 && (
          <Card className="border-border/50 bg-card/90 backdrop-blur-md shadow-xl animate-fade-in">
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
          <Card className="border-border/50 bg-card/90 backdrop-blur-md shadow-xl animate-fade-in">
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

              {/* Service Gallery - shows when service is selected */}
              {formData.serviceId && (
                <div className="pt-2">
                  <ServiceGallery
                    serviceId={formData.serviceId}
                    serviceName={services.find(s => s.id === formData.serviceId)?.name || 'Serviço'}
                    variant="full"
                  />
                </div>
              )}

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
          <Card className="border-border/50 bg-card/90 backdrop-blur-md shadow-xl animate-fade-in">
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
                  {!isBusinessHoursConfigured(barbershop?.opening_time, barbershop?.closing_time) ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center text-destructive">
                      <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        Horários do negócio não configurados.
                      </p>
                      <p className="text-xs mt-1">
                        Peça ao administrador para definir Abertura e Fechamento.
                      </p>
                    </div>
                  ) : timeSlots.length === 0 ? (
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
                  onClick={async () => {
                    const hasPayment = barbershop?.payment_required || false;
                    if (hasPayment) {
                      // If payment required, create appointment first then go to payment
                      setIsLoading(true);
                      setBookingError('');

                      try {
                        const { data, error } = await supabase.rpc('create_public_appointment', {
                          p_barbershop_id: currentBarbershopId,
                          p_barber_id: formData.barberId,
                          p_service_id: formData.serviceId,
                          p_client_name: formData.clientName.trim(),
                          p_client_phone: formData.clientPhone.trim(),
                          p_appointment_date: format(formData.appointmentDate!, 'yyyy-MM-dd'),
                          p_appointment_time: formData.appointmentTime,
                          p_notes: null
                        });

                        if (error) {
                          console.error('Booking RPC error:', error);
                          setBookingError('Não foi possível realizar o agendamento. Tente novamente.');
                          setIsLoading(false);
                          return;
                        }

                        const result = data as { success: boolean; appointment_id?: string; error?: string };

                        if (!result.success) {
                          setBookingError(result.error || 'Não foi possível realizar o agendamento.');
                          setIsLoading(false);
                          return;
                        }

                        // Store appointment for payment validation
                        setCreatedAppointment({
                          id: result.appointment_id,
                          client_name: formData.clientName.trim(),
                          client_phone: formData.clientPhone.trim(),
                          barber_id: formData.barberId,
                          service_id: formData.serviceId,
                          appointment_date: format(formData.appointmentDate!, 'yyyy-MM-dd'),
                          appointment_time: formData.appointmentTime,
                        });

                        setIsLoading(false);
                        setStep(4);
                      } catch (err) {
                        console.error('Error creating appointment:', err);
                        setBookingError('Erro inesperado. Tente novamente.');
                        setIsLoading(false);
                      }
                    } else {
                      // Submit directly
                      handleSubmit();
                    }
                  }}
                  disabled={!formData.appointmentDate || !formData.appointmentTime || isLoading}
                >
                  {isLoading ? 'Agendando...' : (barbershop?.payment_required ? 'Continuar' : 'Confirmar')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment (optional) */}
        {step === 4 && createdAppointment && (
          <PaymentStep
            paymentMethods={(barbershop?.payment_methods_enabled || []).filter(
              (m): m is PaymentMethod => m === 'mpesa' || m === 'emola'
            )}
            mpesaNumber={barbershop?.mpesa_number || null}
            emolaNumber={barbershop?.emola_number || null}
            whatsappNumber={barbershop?.whatsapp_number || ''}
            businessName={barbershop?.name || ''}
            businessId={currentBarbershopId || ''}
            appointmentId={createdAppointment?.id || null}
            clientName={formData.clientName}
            appointmentDate={formData.appointmentDate!}
            appointmentTime={formData.appointmentTime}
            serviceName={services.find(s => s.id === formData.serviceId)?.name || ''}
            servicePrice={services.find(s => s.id === formData.serviceId)?.price || 0}
            professionalName={professionals.find(p => p.id === formData.barberId)?.name || ''}
            onBack={() => setStep(3)}
            onComplete={() => {
              // Payment confirmed via WhatsApp, show success screen
              setIsSuccess(true);
              toast({
                title: 'Agendamento confirmado!',
                description: 'Seu agendamento foi confirmado com sucesso.',
              });
            }}
          />
        )}
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Scissors, Plus, Edit2, Trash2, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  active: boolean;
  allowed_business_types: string[];
}

interface Barber {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
}

interface ServiceProfessional {
  service_id: string;
  professional_id: string;
}

export default function ServicesList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceProfessionals, setServiceProfessionals] = useState<ServiceProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    duration: '', 
    active: true,
    allowedTypes: ['barbearia', 'salao', 'salao_barbearia'] as string[],
    selectedProfessionals: [] as string[]
  });
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const businessType = barbershop?.business_type || 'barbearia';
  const isBarbershop = businessType === 'barbearia';

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
    
    const [servicesRes, barbersRes, spRes] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, price, duration, active, allowed_business_types')
        .eq('barbershop_id', barbershopId)
        .order('name'),
      supabase
        .from('barbers')
        .select('id, name, specialty, active')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('name'),
      supabase
        .from('service_professionals')
        .select('service_id, professional_id')
        .eq('barbershop_id', barbershopId)
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (spRes.data) setServiceProfessionals(spRes.data);
    
    setIsLoading(false);
  };

  const getLinkedProfessionals = (serviceId: string) => {
    const linked = serviceProfessionals.filter(sp => sp.service_id === serviceId);
    return linked.map(sp => barbers.find(b => b.id === sp.professional_id)?.name).filter(Boolean);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.price || !formData.duration || !barbershopId) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.selectedProfessionals.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um profissional para este serviço.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.allowedTypes.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um tipo de negócio permitido.',
        variant: 'destructive',
      });
      return;
    }

    const serviceData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      active: formData.active,
      allowed_business_types: formData.allowedTypes,
    };

    let serviceId: string;

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
        return;
      }
      serviceId = editingService.id;
    } else {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...serviceData, barbershop_id: barbershopId })
        .select('id')
        .single();

      if (error || !data) {
        toast({ title: 'Erro', description: 'Não foi possível criar.', variant: 'destructive' });
        return;
      }
      serviceId = data.id;
    }

    // Atualizar vínculos de profissionais
    // Primeiro, remover todos os vínculos existentes
    await supabase
      .from('service_professionals')
      .delete()
      .eq('service_id', serviceId)
      .eq('barbershop_id', barbershopId);

    // Depois, inserir os novos vínculos
    if (formData.selectedProfessionals.length > 0) {
      const links = formData.selectedProfessionals.map(professionalId => ({
        service_id: serviceId,
        professional_id: professionalId,
        barbershop_id: barbershopId,
      }));

      const { error: linkError } = await supabase
        .from('service_professionals')
        .insert(links);

      if (linkError) {
        console.error('Error linking professionals:', linkError);
        toast({ 
          title: 'Aviso', 
          description: 'Serviço salvo, mas houve erro ao vincular profissionais.',
          variant: 'destructive' 
        });
      }
    }

    toast({ title: 'Sucesso', description: editingService ? 'Serviço atualizado.' : 'Serviço criado.' });
    setIsDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    // Primeiro remover vínculos
    await supabase.from('service_professionals').delete().eq('service_id', id);
    
    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Serviço excluído.' });
      fetchData();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('services').update({ active }).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const openDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      const linkedProfessionals = serviceProfessionals
        .filter(sp => sp.service_id === service.id)
        .map(sp => sp.professional_id);
      
      setFormData({
        name: service.name,
        price: service.price.toString(),
        duration: service.duration.toString(),
        active: service.active,
        allowedTypes: service.allowed_business_types || ['barbearia', 'salao', 'salao_barbearia'],
        selectedProfessionals: linkedProfessionals,
      });
    } else {
      setEditingService(null);
      setFormData({ 
        name: '', 
        price: '', 
        duration: '30', 
        active: true,
        allowedTypes: ['barbearia', 'salao', 'salao_barbearia'],
        selectedProfessionals: []
      });
    }
    setIsDialogOpen(true);
  };

  const toggleProfessional = (professionalId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProfessionals: prev.selectedProfessionals.includes(professionalId)
        ? prev.selectedProfessionals.filter(id => id !== professionalId)
        : [...prev.selectedProfessionals, professionalId]
    }));
  };

  const toggleBusinessType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      allowedTypes: prev.allowedTypes.includes(type)
        ? prev.allowedTypes.filter(t => t !== type)
        : [...prev.allowedTypes, type]
    }));
  };

  const businessTypeLabels: Record<string, string> = {
    'barbearia': 'Barbearia',
    'salao': 'Salão de Beleza',
    'salao_barbearia': 'Salão & Barbearia'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Serviços</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-input border-border"
                  placeholder="Ex: Corte de Cabelo, Manicure"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (MT) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-input border-border"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="bg-input border-border"
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Tipos de negócio permitidos */}
              <div className="space-y-2">
                <Label>Tipos de Negócio Permitidos *</Label>
                <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                  {Object.entries(businessTypeLabels).map(([type, label]) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={formData.allowedTypes.includes(type)}
                        onCheckedChange={() => toggleBusinessType(type)}
                      />
                      <label 
                        htmlFor={`type-${type}`} 
                        className="text-sm cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seleção de profissionais */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Profissionais que executam este serviço *
                </Label>
                {barbers.length === 0 ? (
                  <div className="p-4 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Cadastre profissionais primeiro antes de criar serviços.</span>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 bg-secondary/30 rounded-lg max-h-48 overflow-y-auto">
                    {barbers.map(barber => (
                      <div key={barber.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`barber-${barber.id}`}
                          checked={formData.selectedProfessionals.includes(barber.id)}
                          onCheckedChange={() => toggleProfessional(barber.id)}
                        />
                        <label 
                          htmlFor={`barber-${barber.id}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {barber.name}
                          {barber.specialty && (
                            <span className="text-muted-foreground ml-1">({barber.specialty})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {formData.selectedProfessionals.length === 0 && barbers.length > 0 && (
                  <p className="text-xs text-destructive">Selecione pelo menos um profissional</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="active">Ativo</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button 
                variant="gold" 
                onClick={handleSave}
                disabled={barbers.length === 0}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Lista de Serviços ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {services.map((service) => {
                const linkedProfessionals = getLinkedProfessionals(service.id);
                return (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${service.active ? 'bg-green-500' : 'bg-muted'}`} />
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.price.toFixed(0)} MT • {service.duration} min
                        </p>
                        {linkedProfessionals.length > 0 && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {linkedProfessionals.slice(0, 3).join(', ')}
                            {linkedProfessionals.length > 3 && ` +${linkedProfessionals.length - 3}`}
                          </p>
                        )}
                        {linkedProfessionals.length === 0 && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Sem profissionais vinculados
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.active}
                        onCheckedChange={(checked) => toggleActive(service.id, checked)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openDialog(service)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

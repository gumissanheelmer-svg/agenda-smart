import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Barber {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
}

export default function BarbersList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', active: true });
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBarbershopId();
    }
  }, [user]);

  useEffect(() => {
    if (barbershopId) {
      fetchBarbers();
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

  const fetchBarbers = async () => {
    if (!barbershopId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name, phone, active')
      .eq('barbershop_id', barbershopId)
      .order('name');

    if (error) {
      console.error('Error fetching barbers:', error);
    } else {
      setBarbers(data || []);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !barbershopId) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    if (editingBarber) {
      const { error } = await supabase
        .from('barbers')
        .update({ name: formData.name.trim(), phone: formData.phone.trim() || null, active: formData.active })
        .eq('id', editingBarber.id);

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Barbeiro atualizado.' });
        setIsDialogOpen(false);
        fetchBarbers();
      }
    } else {
      const { error } = await supabase
        .from('barbers')
        .insert({ 
          name: formData.name.trim(), 
          phone: formData.phone.trim() || null, 
          active: formData.active,
          barbershop_id: barbershopId
        });

      if (error) {
        toast({ title: 'Erro', description: 'Não foi possível criar.', variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso', description: 'Barbeiro criado.' });
        setIsDialogOpen(false);
        fetchBarbers();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) return;

    const { error } = await supabase.from('barbers').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Barbeiro excluído.' });
      fetchBarbers();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('barbers').update({ active }).eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    } else {
      fetchBarbers();
    }
  };

  const openDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({ name: barber.name, phone: barber.phone || '', active: barber.active });
    } else {
      setEditingBarber(null);
      setFormData({ name: '', phone: '', active: true });
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Barbeiros</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gold" onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+258 84 000 0000"
                  className="bg-input border-border"
                />
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
              <Button variant="gold" onClick={handleSave}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Lista de Barbeiros ({barbers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : barbers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum barbeiro cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {barbers.map((barber) => (
                <div key={barber.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${barber.active ? 'bg-green-500' : 'bg-muted'}`} />
                    <div>
                      <p className="font-medium text-foreground">{barber.name}</p>
                      <p className="text-sm text-muted-foreground">{barber.phone || 'Sem telefone'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={barber.active}
                      onCheckedChange={(checked) => toggleActive(barber.id, checked)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => openDialog(barber)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(barber.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
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

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAdminBarbershop } from '@/hooks/useAdminBarbershop';
import { 
  UserPlus,
  Users,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Manager {
  id: string;
  user_id: string | null;
  barbershop_id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  status: 'pending' | 'active' | 'blocked';
  created_at: string;
}

export default function ManagersPage() {
  const { toast } = useToast();
  const { user, barbershopId, isAdmin } = useAuth();
  const { barbershop } = useAdminBarbershop();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState<Manager | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (barbershopId) {
      fetchManagers();
    }
  }, [barbershopId]);

  const fetchManagers = async () => {
    if (!barbershopId) return;
    
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('managers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching managers:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os gerentes.',
        variant: 'destructive',
      });
    } else {
      setManagers((data || []) as unknown as Manager[]);
    }
    setIsLoading(false);
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershopId || !user) {
      toast({
        title: 'Erro de permissão',
        description: 'Sem permissão para criar gerente. Confirme se está logado como administrador.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Get the current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Call the Edge Function instead of direct Supabase calls
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manager`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            phone: formData.phone.trim() || null,
            barbershopId: barbershopId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar gerente');
      }

      toast({
        title: 'Gerente criado!',
        description: result.message || `${formData.name} foi criado e aguarda ativação.`,
      });

      setFormData({ name: '', email: '', phone: '', password: '' });
      setIsDialogOpen(false);
      
      // Refresh the managers list (no page reload needed!)
      fetchManagers();
    } catch (err: any) {
      console.error('Error creating manager:', err);
      
      toast({
        title: 'Erro ao criar gerente',
        description: err.message || 'Ocorreu um erro ao criar o gerente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivateManager = async (manager: Manager) => {
    try {
      const { error } = await supabase
        .from('managers')
        .update({ active: true } as any)
        .eq('id', manager.id);

      if (error) throw error;

      toast({
        title: 'Gerente ativado!',
        description: `${manager.name} agora pode acessar o sistema.`,
      });

      fetchManagers();
    } catch (err: any) {
      console.error('Error activating manager:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar o gerente.',
        variant: 'destructive',
      });
    }
  };

  const handleBlockManager = async (manager: Manager) => {
    try {
      const { error } = await supabase
        .from('managers')
        .update({ active: false } as any)
        .eq('id', manager.id);

      if (error) throw error;

      toast({
        title: 'Gerente bloqueado',
        description: `${manager.name} foi bloqueado.`,
      });

      fetchManagers();
    } catch (err: any) {
      console.error('Error blocking manager:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível bloquear o gerente.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteManager = async () => {
    if (!managerToDelete) return;

    try {
      // Remove manager role
      if (managerToDelete.user_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', managerToDelete.user_id)
          .eq('role', 'manager');
      }

      // Deactivate manager record
      const { error } = await supabase
        .from('managers')
        .update({ active: false })
        .eq('id', managerToDelete.id);

      if (error) throw error;

      toast({
        title: 'Gerente removido',
        description: `${managerToDelete.name} foi removido.`,
      });

      fetchManagers();
    } catch (err: any) {
      console.error('Error deleting manager:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o gerente.',
        variant: 'destructive',
      });
    } finally {
      setManagerToDelete(null);
    }
  };

  // Only admins can access this page
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar gerentes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Gerentes</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie os gerentes do seu estabelecimento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchManagers} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Gerente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Gerente</DialogTitle>
                <DialogDescription>
                  O gerente terá acesso ao painel administrativo, podendo gerenciar agendamentos, profissionais e serviços.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateManager} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do gerente"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="+258 84 000 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="gold" disabled={isCreating}>
                    {isCreating ? 'Criando...' : 'Criar Gerente'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">Permissões do Gerente</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Gerentes podem visualizar e gerenciar agendamentos, profissionais, serviços, despesas e horários.
                Eles <strong>não podem</strong> adicionar ou remover outros gerentes, nem alterar configurações do negócio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Managers */}
      {managers.filter(m => m.active && m.status === 'pending').length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              Gerentes Pendentes de Ativação
            </CardTitle>
            <CardDescription>
              {managers.filter(m => m.active && m.status === 'pending').length} gerente(s) aguardando ativação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {managers.filter(m => m.active && m.status === 'pending').map((manager) => (
                <div
                  key={manager.id}
                  className="flex items-center gap-4 p-4 border border-amber-500/30 rounded-lg bg-card"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {manager.name}
                      </h4>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                        Pendente
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {manager.email}
                      </span>
                      {manager.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {manager.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600/50 hover:bg-green-600/10"
                      onClick={() => handleActivateManager(manager)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Ativar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => handleBlockManager(manager)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Bloquear
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Managers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gerentes Ativos
          </CardTitle>
          <CardDescription>
            {managers.filter(m => m.active && m.status === 'active').length} gerente(s) ativo(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : managers.filter(m => m.active && m.status === 'active').length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum gerente ativo
              </h3>
              <p className="text-muted-foreground mb-4">
                {managers.filter(m => m.active && m.status === 'pending').length > 0 
                  ? 'Ative os gerentes pendentes acima ou adicione um novo gerente'
                  : 'Adicione um gerente para ajudar na administração do seu negócio'}
              </p>
              <Button variant="gold" onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Gerente
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {managers.filter(m => m.active && m.status === 'active').map((manager) => (
                <div
                  key={manager.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {manager.name}
                      </h4>
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                        Ativo
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {manager.email}
                      </span>
                      {manager.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {manager.phone}
                        </span>
                      )}
                      <span>
                        Criado em {format(new Date(manager.created_at), "d 'de' MMM, yyyy", { locale: pt })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-600/50 hover:bg-amber-600/10"
                      onClick={() => handleBlockManager(manager)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Bloquear
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setManagerToDelete(manager)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!managerToDelete} onOpenChange={() => setManagerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover gerente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{managerToDelete?.name}</strong> perderá o acesso ao painel administrativo imediatamente.
              Esta ação pode ser desfeita recriando a conta do gerente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteManager}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  UserCheck,
  UserX,
  Clock,
  Ban,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface BarberAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'blocked';
  barber_id: string | null;
  created_at: string;
}

export default function BarberAccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BarberAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BarberAccount | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'block' | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('barber_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as contas.',
        variant: 'destructive',
      });
    } else {
      setAccounts(data as BarberAccount[]);
    }
    setIsLoading(false);
  };

  const handleAction = async () => {
    if (!selectedAccount || !actionType) return;

    const newStatus = actionType === 'approve' ? 'approved' 
                    : actionType === 'reject' ? 'rejected' 
                    : 'blocked';

    const { error } = await supabase
      .from('barber_accounts')
      .update({ approval_status: newStatus })
      .eq('id', selectedAccount.id);

    if (error) {
      console.error('Error updating account:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: actionType === 'approve' 
          ? 'Conta aprovada! O barbeiro já pode acessar o sistema.'
          : actionType === 'reject'
          ? 'Conta rejeitada.'
          : 'Conta bloqueada.',
      });
      fetchAccounts();
    }

    setSelectedAccount(null);
    setActionType(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aprovado</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejeitado</Badge>;
      case 'blocked':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Bloqueado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'blocked':
        return <Ban className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const pendingCount = accounts.filter(a => a.approval_status === 'pending').length;
  const approvedCount = accounts.filter(a => a.approval_status === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Contas de Barbeiros</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as solicitações de acesso dos barbeiros
          </p>
        </div>
        <Button variant="outline" onClick={fetchAccounts} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.approval_status === 'rejected').length}
                </p>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {accounts.filter(a => a.approval_status === 'blocked').length}
                </p>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Contas</CardTitle>
          <CardDescription>
            {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma conta encontrada
              </h3>
              <p className="text-muted-foreground">
                As solicitações de conta aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {getStatusIcon(account.approval_status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {account.name}
                      </h4>
                      {getStatusBadge(account.approval_status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {account.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {account.phone}
                      </span>
                      <span>
                        {format(new Date(account.created_at), "d 'de' MMM, yyyy", { locale: pt })}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {account.approval_status !== 'approved' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAccount(account);
                            setActionType('approve');
                          }}
                          className="text-green-500"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Aprovar
                        </DropdownMenuItem>
                      )}
                      {account.approval_status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAccount(account);
                            setActionType('reject');
                          }}
                          className="text-red-500"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Rejeitar
                        </DropdownMenuItem>
                      )}
                      {account.approval_status === 'approved' && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAccount(account);
                            setActionType('block');
                          }}
                          className="text-red-500"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Bloquear
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedAccount && !!actionType} onOpenChange={() => {
        setSelectedAccount(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' && 'Aprovar conta?'}
              {actionType === 'reject' && 'Rejeitar conta?'}
              {actionType === 'block' && 'Bloquear conta?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' && (
                <>
                  Ao aprovar, <strong>{selectedAccount?.name}</strong> terá acesso imediato ao painel de barbeiro.
                </>
              )}
              {actionType === 'reject' && (
                <>
                  Ao rejeitar, <strong>{selectedAccount?.name}</strong> não poderá acessar o sistema.
                </>
              )}
              {actionType === 'block' && (
                <>
                  Ao bloquear, <strong>{selectedAccount?.name}</strong> perderá o acesso ao sistema imediatamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                actionType === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {actionType === 'approve' && 'Aprovar'}
              {actionType === 'reject' && 'Rejeitar'}
              {actionType === 'block' && 'Bloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

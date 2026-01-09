import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, Clock, ShieldX, Building2, UserPlus, LogOut } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

type LoginState = 'form' | 'pending' | 'manager_pending' | 'unauthorized';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, isSuperAdmin, isAdmin, isManager, isActiveManager, isBarber, isApprovedBarber, barbershopInfo, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>('form');
  const [isCheckingRoles, setIsCheckingRoles] = useState(false);

  useEffect(() => {
    // Don't do anything while loading or checking roles
    if (isLoading || isCheckingRoles) return;
    
    if (user) {
      // Super Admin takes priority
      if (isSuperAdmin) {
        navigate('/superadmin/dashboard');
        return;
      }
      
      // Admin with approved barbershop
      if (isAdmin && barbershopInfo) {
        if (barbershopInfo.approval_status === 'approved') {
          navigate('/admin/dashboard');
          return;
        }
        // Pending, blocked, or rejected barbershop
        if (['pending', 'blocked', 'rejected'].includes(barbershopInfo.approval_status)) {
          navigate('/pending-approval');
          return;
        }
      }
      
      // Manager with approved barbershop - check if manager is active
      if (isManager && barbershopInfo) {
        if (!isActiveManager) {
          // Manager exists but is not active (pending or blocked)
          setLoginState('manager_pending');
          return;
        }
        if (barbershopInfo.approval_status === 'approved') {
          navigate('/admin/dashboard');
          return;
        }
        // Pending, blocked, or rejected barbershop
        if (['pending', 'blocked', 'rejected'].includes(barbershopInfo.approval_status)) {
          navigate('/pending-approval');
          return;
        }
      }
      
      // Admin or Manager without barbershop info yet (still loading)
      if ((isAdmin || isManager) && !barbershopInfo) {
        // Wait a bit more for barbershop info
        return;
      }
      
      // Approved barber
      if (isApprovedBarber) {
        navigate('/barber/dashboard');
        return;
      }
      
      // Pending barber
      if (isBarber) {
        setLoginState('pending');
        return;
      }
      
      // User exists but is neither admin nor barber
      setLoginState('unauthorized');
    }
  }, [user, isSuperAdmin, isAdmin, isManager, isActiveManager, isBarber, isApprovedBarber, barbershopInfo, isLoading, isCheckingRoles, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setIsCheckingRoles(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        setIsCheckingRoles(false);
        toast({
          title: 'Erro ao entrar',
          description: 'Email ou senha incorretos.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Verificando permissões...',
      });
      
      // Wait for roles to be verified
      setTimeout(() => {
        setIsCheckingRoles(false);
      }, 1500);
    } catch (err) {
      setIsCheckingRoles(false);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isCheckingRoles) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Logo size="lg" />
          <p className="text-muted-foreground mt-4">
            {isCheckingRoles ? 'Verificando permissões...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  // Pending barber state
  if (loginState === 'pending') {
    return (
      <>
        <Helmet>
          <title>Conta Pendente - Barbearia Elite</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-4">
                  Conta em Análise
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Sua conta foi criada com sucesso e está aguardando aprovação do administrador.
                </p>

                <Button variant="gold" onClick={() => navigate('/')}>
                  Voltar ao Site
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Pending manager state
  if (loginState === 'manager_pending') {
    return (
      <>
        <Helmet>
          <title>Conta Pendente - Barbearia Elite</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-amber-500" />
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-4">
                  Aguardando Ativação
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Sua conta de gerente foi criada com sucesso e está aguardando ativação pelo administrador do estabelecimento.
                </p>

                <Button variant="gold" onClick={() => navigate('/')}>
                  Voltar ao Site
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Unauthorized state
  if (loginState === 'unauthorized') {
    const handleLogout = async () => {
      const { signOut } = await import('@/hooks/useAuth').then(m => ({ signOut: m.useAuth }));
      // Use the signOut from context
      await import('@/integrations/supabase/client').then(async ({ supabase }) => {
        await supabase.auth.signOut();
        setLoginState('form');
        navigate('/login');
      });
    };

    return (
      <>
        <Helmet>
          <title>Acesso Não Autorizado - Barbearia Elite</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <ShieldX className="w-10 h-10 text-destructive" />
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-4">
                  Acesso Não Autorizado
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Esta conta não está vinculada a nenhum estabelecimento ou perfil profissional.
                </p>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    O que você deseja fazer?
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3"
                      onClick={() => navigate('/register')}
                    >
                      <Building2 className="w-4 h-4" />
                      Cadastrar meu estabelecimento
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3"
                      onClick={() => navigate('/barber/register')}
                    >
                      <UserPlus className="w-4 h-4" />
                      Me cadastrar como profissional
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Sair e usar outra conta
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate('/')}
                    >
                      Voltar ao Site
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Entrar - Barbearia Elite</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo size="md" />
          </div>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display">
                Área Restrita
              </CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-input border-border"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-input border-border"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  className="w-full mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 text-center space-y-3">
                <Link 
                  to="/barber/register" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  É profissional? Crie sua conta aqui
                </Link>
                <div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                    ← Voltar ao site
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, Clock, ShieldX } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

type LoginState = 'form' | 'pending' | 'unauthorized';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, isSuperAdmin, isAdmin, isBarber, isApprovedBarber, barbershopInfo, isLoading } = useAuth();
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
      
      // Admin without barbershop info yet (still loading)
      if (isAdmin && !barbershopInfo) {
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
  }, [user, isSuperAdmin, isAdmin, isBarber, isApprovedBarber, barbershopInfo, isLoading, isCheckingRoles, navigate]);

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
                  A sua conta está a aguardar aprovação do administrador.
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
                  Esta conta não tem permissão para acessar o sistema.
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

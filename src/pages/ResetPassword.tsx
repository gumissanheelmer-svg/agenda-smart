import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [sessionState, setSessionState] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const initializeRecoverySession = async () => {
      try {
        // Check for hash fragments (Supabase sends tokens in hash)
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        // Handle error in URL (expired or invalid token)
        if (errorCode || errorDescription) {
          console.error('Recovery error:', errorCode, errorDescription);
          setErrorMessage(errorDescription || 'O link de recuperação é inválido ou expirou.');
          setSessionState('invalid');
          return;
        }

        // If we have tokens in the hash, set the session
        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting recovery session:', error);
            setErrorMessage('Não foi possível validar o link de recuperação.');
            setSessionState('invalid');
            return;
          }

          // Clear hash from URL for cleaner UX
          window.history.replaceState(null, '', location.pathname);
          setSessionState('valid');
          return;
        }

        // Check if we already have a valid session (user might have refreshed the page)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSessionState('valid');
          return;
        }

        // No valid session or tokens found
        setErrorMessage('Nenhum link de recuperação válido encontrado. Solicite um novo link.');
        setSessionState('invalid');
      } catch (error) {
        console.error('Error initializing recovery:', error);
        setErrorMessage('Ocorreu um erro ao processar o link de recuperação.');
        setSessionState('error');
      }
    };

    initializeRecoverySession();

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionState('valid');
      }
    });

    return () => subscription.unsubscribe();
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim() || !confirmPassword.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível redefinir a senha.',
          variant: 'destructive',
        });
        return;
      }

      // Sign out the user after password reset
      await supabase.auth.signOut();

      setResetSuccess(true);
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso. Pode entrar novamente.',
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (sessionState === 'loading') {
    return (
      <>
        <Helmet>
          <title>Verificando... - Agenda Smart</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>
          
          <div className="text-center relative z-10">
            <Logo size="lg" />
            <div className="flex items-center justify-center gap-2 mt-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando link de recuperação...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Invalid or expired link
  if (sessionState === 'invalid' || sessionState === 'error') {
    return (
      <>
        <Helmet>
          <title>Link Inválido - Agenda Smart</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Logo size="md" />
            </div>

            <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-destructive" />
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-4">
                  Link Inválido ou Expirado
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  {errorMessage || 'O link de recuperação de senha é inválido ou já expirou. Solicite um novo link.'}
                </p>

                <div className="flex flex-col gap-3">
                  <Button variant="gold" onClick={() => navigate('/forgot-password')}>
                    Solicitar Novo Link
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/login')}>
                    Voltar ao Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <>
        <Helmet>
          <title>Senha Atualizada - Agenda Smart</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Logo size="md" />
            </div>

            <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-2xl font-display text-foreground mb-4">
                  Senha Atualizada com Sucesso!
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Sua senha foi alterada com sucesso. Pode entrar novamente com a nova senha.
                </p>

                <Button variant="gold" onClick={() => navigate('/login')}>
                  Ir para Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  // Password reset form
  return (
    <>
      <Helmet>
        <title>Redefinir Senha - Agenda Smart</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
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
                Redefinir Senha
              </CardTitle>
              <CardDescription>
                Crie uma nova senha para sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-input border-border"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-input border-border"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                  {confirmPassword && password === confirmPassword && password.length >= 6 && (
                    <p className="text-xs text-primary">✓ Senhas coincidem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  className="w-full mt-6"
                  disabled={isSubmitting || password.length < 6 || password !== confirmPassword}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    'Atualizar Senha'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
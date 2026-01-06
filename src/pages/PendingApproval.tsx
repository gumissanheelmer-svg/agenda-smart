import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { Clock, LogOut, Mail, Phone } from 'lucide-react';

export default function PendingApproval() {
  const navigate = useNavigate();
  const { signOut, barbershopInfo, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Aguardando Aprovação - Sistema de Agendamento</title>
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

          <Card className="border-border/50 bg-card/80 backdrop-blur text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              
              <h2 className="text-2xl font-display text-foreground mb-2">
                Aguardando Aprovação
              </h2>
              
              {barbershopInfo && (
                <p className="text-primary font-medium mb-4">
                  {barbershopInfo.name}
                </p>
              )}
              
              <p className="text-muted-foreground mb-6">
                O seu negócio está em análise pelo administrador do sistema. 
                Assim que for aprovado, você receberá acesso ao painel administrativo.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-foreground mb-3">Informações de Contato:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>gumissanheelmer@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>+258 84 XXX XXXX</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Verificar Status
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>

              {user && (
                <p className="text-xs text-muted-foreground mt-4">
                  Logado como: {user.email}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

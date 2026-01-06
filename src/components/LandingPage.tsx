import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Scissors, Clock, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onBookNow: () => void;
  barbershopName?: string;
  logoUrl?: string | null;
}

export function LandingPage({ onBookNow, barbershopName, logoUrl }: LandingPageProps) {
  const displayName = barbershopName || 'Barbearia Elite';

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {logoUrl ? (
          <img src={logoUrl} alt={displayName} className="h-10 w-auto object-contain" />
        ) : (
          <Logo size="sm" />
        )}
        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Entrar
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="h-24 w-auto object-contain mx-auto" />
          ) : (
            <Logo size="lg" showText={false} />
          )}
        </div>

        <h1 
          className="mt-8 text-5xl md:text-7xl font-display font-bold text-foreground animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          {displayName.includes(' ') ? (
            <>
              {displayName.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="text-primary">{displayName.split(' ').slice(-1)}</span>
            </>
          ) : (
            <span className="text-primary">{displayName}</span>
          )}
        </h1>

        <p 
          className="mt-4 text-lg md:text-xl text-muted-foreground max-w-md animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          Estilo e precisão em cada corte. Agende seu horário agora.
        </p>

        <Button 
          variant="hero" 
          size="xl"
          className="mt-10 animate-slide-up"
          style={{ animationDelay: '0.4s' }}
          onClick={onBookNow}
        >
          <Scissors className="w-5 h-5 mr-2" />
          Agendar Agora
        </Button>

        {/* Features */}
        <div 
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Agendamento Rápido</h3>
            <p className="text-sm text-muted-foreground mt-1">Em poucos cliques</p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Profissionais Top</h3>
            <p className="text-sm text-muted-foreground mt-1">Equipa experiente</p>
          </div>

          <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Localização Central</h3>
            <p className="text-sm text-muted-foreground mt-1">Fácil acesso</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {displayName}. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors, MapPin } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface BarbershopPreview {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
}

export default function BarbershopList() {
  const [barbershops, setBarbershops] = useState<BarbershopPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBarbershops();
  }, []);

  const loadBarbershops = async () => {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, slug, name, logo_url, primary_color')
      .eq('active', true)
      .order('name');

    if (!error && data) {
      setBarbershops(data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Logo size="lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Barbearias - Agendamento Online | Moçambique</title>
        <meta 
          name="description" 
          content="Encontre a melhor barbearia e agende seu corte online. Profissionais experientes em Moçambique." 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <Link 
              to="/register"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Criar Barbearia
            </Link>
            <Link 
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 px-6 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Escolha a sua <span className="text-primary">Barbearia</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Selecione uma barbearia para agendar o seu horário
            </p>
          </div>

          {barbershops.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma barbearia disponível
              </h2>
              <p className="text-muted-foreground mb-6">
                Seja o primeiro a registrar sua barbearia!
              </p>
              <Link 
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Scissors className="w-5 h-5" />
                Criar Minha Barbearia
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barbershops.map((shop) => (
                <Link key={shop.id} to={`/b/${shop.slug}`}>
                  <Card className="group cursor-pointer border-border/50 bg-card/80 backdrop-blur hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        {shop.logo_url ? (
                          <img 
                            src={shop.logo_url} 
                            alt={shop.name}
                            className="w-16 h-16 rounded-full object-cover border-2"
                            style={{ borderColor: shop.primary_color }}
                          />
                        ) : (
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${shop.primary_color}20` }}
                          >
                            <Scissors 
                              className="w-8 h-8" 
                              style={{ color: shop.primary_color }}
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {shop.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Agendar horário →
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Sistema de Agendamento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Scissors, Calendar, Users, MessageSquare, ArrowRight } from 'lucide-react';

export default function BarbershopList() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Helmet>
        <title>Agendou - Sistema de Agendamento para Barbearias e Salões</title>
        <meta name="description" content="Sistema completo de agendamento online para barbearias, salões de beleza e muito mais. Gerencie seus clientes e equipe de forma simples." />
      </Helmet>

      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <Link to="/register">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Criar Meu Negócio
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="default" size="sm">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 text-center">
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Logo size="lg" showText={false} />
          </div>

          <h1 
            className="mt-8 text-4xl md:text-6xl font-display font-bold text-foreground animate-slide-up max-w-3xl"
            style={{ animationDelay: '0.2s' }}
          >
            Sistema de Agendamento para{' '}
            <span className="text-primary">Barbearias e Salões</span>
          </h1>

          <p 
            className="mt-4 text-lg md:text-xl text-muted-foreground max-w-xl animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            Gerencie seu negócio de forma simples. Seus clientes agendam online, você foca no que realmente importa.
          </p>

          <div 
            className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up"
            style={{ animationDelay: '0.4s' }}
          >
            <Link to="/register">
              <Button variant="hero" size="xl">
                <Scissors className="w-5 h-5 mr-2" />
                Começar Agora - É Grátis
              </Button>
            </Link>
          </div>

          <p 
            className="mt-6 text-sm text-muted-foreground animate-slide-up"
            style={{ animationDelay: '0.5s' }}
          >
            É cliente? Peça o link de agendamento ao seu profissional.
          </p>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-foreground mb-12">
              Tudo que você precisa para gerir seu negócio
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Agendamento 24h</h3>
                <p className="text-sm text-muted-foreground">Clientes agendam a qualquer hora, mesmo quando você não está</p>
              </div>

              <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Gestão de Equipe</h3>
                <p className="text-sm text-muted-foreground">Cadastre profissionais e distribua os agendamentos automaticamente</p>
              </div>

              <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Scissors className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Serviços Personalizados</h3>
                <p className="text-sm text-muted-foreground">Configure seus serviços, preços e duração como quiser</p>
              </div>

              <div className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Link Exclusivo</h3>
                <p className="text-sm text-muted-foreground">Seu negócio com link próprio para compartilhar com clientes</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground mb-8">
              Crie seu espaço em minutos e comece a receber agendamentos hoje mesmo.
            </p>
            <Link to="/register">
              <Button variant="hero" size="lg">
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-sm text-muted-foreground border-t border-border/50">
        <p>© {new Date().getFullYear()} Agendou. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

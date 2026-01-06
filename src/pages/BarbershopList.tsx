import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Scissors, Calendar, Users, MessageSquare, ArrowRight } from 'lucide-react';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
};

const floatAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const
  }
};

const featureCardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 }
  }
};

export default function BarbershopList() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Helmet>
        <title>Agendou - Sistema de Agendamento para Barbearias e Salões</title>
        <meta name="description" content="Sistema completo de agendamento online para barbearias, salões de beleza e muito mais. Gerencie seus clientes e equipe de forma simples." />
      </Helmet>

      {/* Animated Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.8, 0.5, 0.8],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
      </motion.header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={scaleIn}
          >
            <motion.div animate={floatAnimation}>
              <Logo size="lg" showText={false} />
            </motion.div>
          </motion.div>

          <motion.h1 
            className="mt-8 text-4xl md:text-6xl font-display font-bold text-foreground max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Sistema de Agendamento para{' '}
            <motion.span 
              className="text-primary inline-block"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.6,
                type: "spring",
                stiffness: 120
              }}
            >
              Barbearias e Salões
            </motion.span>
          </motion.h1>

          <motion.p 
            className="mt-4 text-lg md:text-xl text-muted-foreground max-w-xl"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            Gerencie seu negócio de forma simples. Seus clientes agendam online, você foca no que realmente importa.
          </motion.p>

          <motion.div 
            className="mt-10 flex flex-col sm:flex-row gap-4"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <Link to="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button variant="hero" size="xl">
                  <Scissors className="w-5 h-5 mr-2" />
                  Começar Agora - É Grátis
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          <motion.p 
            className="mt-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            É cliente? Peça o link de agendamento ao seu profissional.
          </motion.p>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.h2 
              className="text-2xl md:text-3xl font-display font-bold text-center text-foreground mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              Tudo que você precisa para gerir seu negócio
            </motion.h2>
            
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {[
                { icon: Calendar, title: "Agendamento 24h", desc: "Clientes agendam a qualquer hora, mesmo quando você não está" },
                { icon: Users, title: "Gestão de Equipe", desc: "Cadastre profissionais e distribua os agendamentos automaticamente" },
                { icon: Scissors, title: "Serviços Personalizados", desc: "Configure seus serviços, preços e duração como quiser" },
                { icon: MessageSquare, title: "Link Exclusivo", desc: "Seu negócio com link próprio para compartilhar com clientes" }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur text-center group cursor-default"
                  variants={featureCardVariants}
                  whileHover={{ 
                    y: -8, 
                    boxShadow: "0 20px 40px -15px hsl(var(--primary) / 0.2)",
                    borderColor: "hsl(var(--primary) / 0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div 
                    className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <feature.icon className="w-7 h-7 text-primary" />
                  </motion.div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <motion.div 
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
          >
            <motion.h2 
              className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Pronto para começar?
            </motion.h2>
            <motion.p 
              className="text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Crie seu espaço em minutos e comece a receber agendamentos hoje mesmo.
            </motion.p>
            <Link to="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <Button variant="hero" size="lg">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 py-8 text-center text-sm text-muted-foreground border-t border-border/50"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p>© {new Date().getFullYear()} Agendou. Todos os direitos reservados.</p>
      </motion.footer>
    </div>
  );
}

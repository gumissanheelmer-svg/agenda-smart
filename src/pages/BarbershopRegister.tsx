import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Upload, Eye, ArrowLeft, Loader2 } from 'lucide-react';

interface FormData {
  // Owner info
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerPhone: string;
  // Barbershop info
  name: string;
  slug: string;
  whatsappNumber: string;
  // Theme
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  // Logo
  logoFile: File | null;
  logoPreview: string | null;
}

export default function BarbershopRegister() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerPhone: '',
    name: '',
    slug: '',
    whatsappNumber: '',
    primaryColor: '#D4AF37',
    secondaryColor: '#1a1a2e',
    backgroundColor: '#0f0f1a',
    textColor: '#ffffff',
    logoFile: null,
    logoPreview: null,
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O logo deve ter no máximo 2MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          logoFile: file,
          logoPreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (!formData.ownerName.trim() || !formData.ownerEmail.trim() || !formData.ownerPassword.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do proprietário",
        variant: "destructive",
      });
      return false;
    }
    if (formData.ownerPassword.length < 6) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e slug da barbearia",
        variant: "destructive",
      });
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast({
        title: "Slug inválido",
        description: "O slug deve conter apenas letras minúsculas, números e hífens",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // 1. Check if slug is available
      const { data: existingShop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('slug', formData.slug)
        .maybeSingle();

      if (existingShop) {
        toast({
          title: "Slug indisponível",
          description: "Este endereço já está em uso. Escolha outro.",
          variant: "destructive",
        });
        setIsLoading(false);
        setStep(2);
        return;
      }

      // 2. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.ownerEmail,
        password: formData.ownerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
          data: {
            name: formData.ownerName,
            phone: formData.ownerPhone,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Falha ao criar conta');
      }

      const userId = authData.user.id;

      // Wait for session to be established
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Try to sign in if session not immediately available (auto-confirm enabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.ownerEmail,
          password: formData.ownerPassword,
        });
        if (signInError) {
          console.warn('Auto sign-in failed, user may need to confirm email:', signInError.message);
        }
      }

      // 3. Upload logo if provided
      let logoUrl: string | null = null;
      if (formData.logoFile) {
        const fileExt = formData.logoFile.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, formData.logoFile);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);
          logoUrl = urlData.publicUrl;
        }
      }

      // 4. Create barbershop
      const { data: barbershopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: formData.name,
          slug: formData.slug,
          whatsapp_number: formData.whatsappNumber || null,
          logo_url: logoUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          background_color: formData.backgroundColor,
          text_color: formData.textColor,
          active: true,
        })
        .select()
        .single();

      if (shopError) {
        throw new Error('Falha ao criar barbearia: ' + shopError.message);
      }

      // 5. Assign admin role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          barbershop_id: barbershopData.id,
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      toast({
        title: "Barbearia criada com sucesso!",
        description: "Você será redirecionado para o painel administrativo.",
      });

      // Redirect to admin dashboard
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro ao registrar",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ThemePreview = () => (
    <div 
      className="rounded-lg p-4 border"
      style={{ 
        backgroundColor: formData.backgroundColor,
        borderColor: formData.primaryColor,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {formData.logoPreview ? (
          <img 
            src={formData.logoPreview} 
            alt="Logo preview" 
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: formData.primaryColor }}
          >
            <Scissors className="w-6 h-6" style={{ color: formData.backgroundColor }} />
          </div>
        )}
        <h3 style={{ color: formData.textColor }} className="font-bold">
          {formData.name || 'Nome da Barbearia'}
        </h3>
      </div>
      <div 
        className="rounded p-2 text-center text-sm font-medium"
        style={{ 
          backgroundColor: formData.primaryColor,
          color: formData.backgroundColor,
        }}
      >
        Agendar Horário
      </div>
      <div 
        className="mt-2 rounded p-2 text-center text-sm"
        style={{ 
          backgroundColor: formData.secondaryColor,
          color: formData.textColor,
        }}
      >
        Serviços
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 py-8 px-4">
      <Helmet>
        <title>Registrar Barbearia | Sistema de Agendamento</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step > 1 ? 'Voltar' : 'Início'}
        </Button>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {step === 1 && 'Dados do Proprietário'}
              {step === 2 && 'Dados da Barbearia'}
              {step === 3 && 'Personalização'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Crie sua conta de administrador'}
              {step === 2 && 'Configure as informações básicas'}
              {step === 3 && 'Defina as cores e logo da sua barbearia'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Owner Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nome completo *</Label>
                  <Input
                    id="ownerName"
                    placeholder="Seu nome"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail">E-mail *</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.ownerEmail}
                    onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Senha *</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.ownerPassword}
                    onChange={(e) => handleInputChange('ownerPassword', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPhone">Telefone (opcional)</Label>
                  <Input
                    id="ownerPhone"
                    placeholder="+258 84 123 4567"
                    value={formData.ownerPhone}
                    onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => validateStep1() && setStep(2)}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 2: Barbershop Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da barbearia *</Label>
                  <Input
                    id="name"
                    placeholder="Minha Barbearia"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Endereço (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/b/</span>
                    <Input
                      id="slug"
                      placeholder="minha-barbearia"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seus clientes acessarão em: /b/{formData.slug || 'seu-endereco'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp (opcional)</Label>
                  <Input
                    id="whatsappNumber"
                    placeholder="+258 84 123 4567"
                    value={formData.whatsappNumber}
                    onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para enviar confirmações de agendamento
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => validateStep2() && setStep(3)}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Step 3: Theme */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo (opcional)</Label>
                  <div className="flex items-center gap-4">
                    {formData.logoPreview ? (
                      <img 
                        src={formData.logoPreview} 
                        alt="Logo" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Scissors className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                      <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Enviar logo</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor primária</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="primaryColor"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Cor secundária</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Cor de fundo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="backgroundColor"
                        value={formData.backgroundColor}
                        onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.backgroundColor}
                        onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Cor do texto</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="textColor"
                        value={formData.textColor}
                        onChange={(e) => handleInputChange('textColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={formData.textColor}
                        onChange={(e) => handleInputChange('textColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Pré-visualização
                  </Label>
                  <ThemePreview />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando barbearia...
                    </>
                  ) : (
                    'Criar Barbearia'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

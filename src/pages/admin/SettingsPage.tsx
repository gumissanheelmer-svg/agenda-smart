import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Save, MessageCircle, Palette, Image, Upload, Trash2, ImageIcon, CreditCard, Smartphone, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

interface BarbershopSettings {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  whatsapp_number: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  opening_time: string | null;
  closing_time: string | null;
  business_type: string;
  background_image_url: string | null;
  background_overlay_level: 'low' | 'medium' | 'high';
  mpesa_number: string | null;
  emola_number: string | null;
  payment_methods_enabled: string[];
  payment_required: boolean;
  prep_buffer_minutes: number;
  cleanup_buffer_minutes: number;
  slot_interval_minutes: number;
}

const getBusinessLabels = (type: string) => {
  switch (type) {
    case 'salao':
      return {
        businessName: 'Nome do Salão',
        businessLabel: 'Salão de Beleza',
        slugPlaceholder: 'meu-salao'
      };
    case 'salao_barbearia':
      return {
        businessName: 'Nome do Estabelecimento',
        businessLabel: 'Salão & Barbearia',
        slugPlaceholder: 'meu-estabelecimento'
      };
    default:
      return {
        businessName: 'Nome da Barbearia',
        businessLabel: 'Barbearia',
        slugPlaceholder: 'minha-barbearia'
      };
  }
};

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Upload states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  
  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('barbershop_id')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData?.barbershop_id) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', roleData.barbershop_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      setSettings(data as BarbershopSettings);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({
        name: settings.name,
        slug: settings.slug,
        logo_url: settings.logo_url,
        whatsapp_number: settings.whatsapp_number,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        background_color: settings.background_color,
        text_color: settings.text_color,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        background_image_url: settings.background_image_url,
        background_overlay_level: settings.background_overlay_level,
        mpesa_number: settings.mpesa_number,
        emola_number: settings.emola_number,
        payment_methods_enabled: settings.payment_methods_enabled,
        payment_required: settings.payment_required,
        prep_buffer_minutes: settings.prep_buffer_minutes,
        cleanup_buffer_minutes: settings.cleanup_buffer_minutes,
        slot_interval_minutes: settings.slot_interval_minutes,
      })
      .eq('id', settings.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
      });
    }
    setIsSaving(false);
  };

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'No iPhone, envie JPG/PNG (HEIC não é suportado).';
    }
    if (file.size > MAX_SIZE) {
      return 'O tamanho máximo permitido é 5MB.';
    }
    return null;
  };

  // Generic upload handler
  const handleImageUpload = async (
    file: File,
    bucket: 'logos' | 'backgrounds',
    fileName: string,
    setUploading: (v: boolean) => void,
    setPreview: (v: string | null) => void,
    currentUrl: string | null,
    onSuccess: (url: string) => void
  ) => {
    const error = validateFile(file);
    if (error) {
      toast({ title: 'Formato inválido', description: error, variant: 'destructive' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      // Delete old file if exists
      if (currentUrl) {
        const oldPath = currentUrl.split(`/${bucket}/`)[1];
        if (oldPath) {
          await supabase.storage.from(bucket).remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        toast({
          title: 'Erro no upload',
          description: `Não foi possível enviar a imagem: ${uploadError.message}`,
          variant: 'destructive',
        });
        setPreview(null);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      onSuccess(publicUrl);
      setPreview(null);
      toast({ title: 'Imagem carregada', description: 'Clique em Salvar para aplicar.' });
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast({
        title: 'Erro inesperado',
        description: `Falha no upload: ${err?.message || 'Erro desconhecido'}`,
        variant: 'destructive',
      });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // Logo upload handler
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) {
      toast({ title: 'Nenhuma imagem', description: 'Selecione uma imagem.', variant: 'destructive' });
      return;
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${settings.id}/logo.${fileExt}`;
    
    await handleImageUpload(
      file,
      'logos',
      fileName,
      setIsUploadingLogo,
      setLogoPreview,
      settings.logo_url,
      (url) => setSettings({ ...settings, logo_url: url })
    );
    
    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // Background upload handler
  const handleBackgroundSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) {
      toast({ title: 'Nenhuma imagem', description: 'Selecione uma imagem.', variant: 'destructive' });
      return;
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${settings.id}/background.${fileExt}`;
    
    await handleImageUpload(
      file,
      'backgrounds',
      fileName,
      setIsUploadingBackground,
      setBackgroundPreview,
      settings.background_image_url,
      (url) => setSettings({ ...settings, background_image_url: url })
    );
    
    // Reset input
    if (backgroundInputRef.current) backgroundInputRef.current.value = '';
  };

  // Remove logo
  const handleRemoveLogo = async () => {
    if (!settings?.logo_url) return;

    const path = settings.logo_url.split('/logos/')[1];
    if (path) {
      await supabase.storage.from('logos').remove([path]);
    }

    setSettings({ ...settings, logo_url: null });
    setLogoPreview(null);
    toast({ title: 'Logo removido', description: 'Clique em Salvar para aplicar.' });
  };

  // Remove background
  const handleRemoveBackground = async () => {
    if (!settings?.background_image_url) return;

    const path = settings.background_image_url.split('/backgrounds/')[1];
    if (path) {
      await supabase.storage.from('backgrounds').remove([path]);
    }

    setSettings({ ...settings, background_image_url: null });
    setBackgroundPreview(null);
    toast({ title: 'Imagem de fundo removida', description: 'Clique em Salvar para aplicar.' });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-safe space-y-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-safe space-y-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">Bem-vindo! Configure seu negócio para começar.</p>
            <Button 
              className="mt-4 w-full sm:w-auto" 
              onClick={() => window.location.href = '/register'}
            >
              Criar Negócio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const labels = getBusinessLabels(settings.business_type);

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-safe space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Button 
          variant="gold" 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Business Info */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Informações do Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name" className="text-sm sm:text-base">{labels.businessName}</Label>
                <Input
                  id="business_name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="bg-input border-border w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm sm:text-base">URL (slug)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs sm:text-sm">/b/</span>
                  <Input
                    id="slug"
                    value={settings.slug}
                    onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="bg-input border-border flex-1"
                    placeholder={labels.slugPlaceholder}
                  />
                </div>
              </div>
            </div>
            
            {/* Logo Upload Section */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-sm sm:text-base font-medium">Logotipo</Label>
              
              {/* Logo Preview */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                  {(logoPreview || settings.logo_url) ? (
                    <img 
                      src={logoPreview || settings.logo_url || ''} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="w-8 h-8 opacity-50" />
                      <p className="text-xs mt-1">Sem logo</p>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex-1 sm:flex-none"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploadingLogo ? 'Enviando...' : 'Carregar Logo'}
                    </Button>
                    {settings.logo_url && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                  
                  {/* URL fallback (optional) */}
                  <div className="space-y-1">
                    <Label htmlFor="logo_url" className="text-xs text-muted-foreground">Ou insira uma URL (opcional)</Label>
                    <Input
                      id="logo_url"
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })}
                      className="bg-input border-border text-sm"
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, WEBP. Tamanho máximo: 5MB.
              </p>
            </div>

            {/* Operating Hours */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div className="space-y-2">
                <Label htmlFor="opening_time" className="text-sm sm:text-base">Abertura</Label>
                <Input
                  id="opening_time"
                  type="time"
                  value={settings.opening_time || '09:00'}
                  onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                  className="bg-input border-border w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time" className="text-sm sm:text-base">Fechamento</Label>
                <Input
                  id="closing_time"
                  type="time"
                  value={settings.closing_time || '18:00'}
                  onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                  className="bg-input border-border w-full"
                />
              </div>
            </div>

            {/* Scheduling Configuration */}
            <div className="pt-4 border-t border-border/50 space-y-4">
              <h4 className="text-sm font-medium text-foreground">Configurações de Agendamento</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="slot_interval" className="text-xs sm:text-sm">Intervalo (min)</Label>
                  <Select
                    value={String(settings.slot_interval_minutes ?? 30)}
                    onValueChange={(value) => setSettings({ ...settings, slot_interval_minutes: parseInt(value, 10) })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prep_buffer" className="text-xs sm:text-sm">Buffer Início</Label>
                  <Select
                    value={String(settings.prep_buffer_minutes ?? 0)}
                    onValueChange={(value) => setSettings({ ...settings, prep_buffer_minutes: parseInt(value, 10) })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 min</SelectItem>
                      <SelectItem value="10">10 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cleanup_buffer" className="text-xs sm:text-sm">Buffer Fim</Label>
                  <Select
                    value={String(settings.cleanup_buffer_minutes ?? 0)}
                    onValueChange={(value) => setSettings({ ...settings, cleanup_buffer_minutes: parseInt(value, 10) })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 min</SelectItem>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                <strong>Intervalo:</strong> tempo entre horários disponíveis.<br/>
                <strong>Buffer Início:</strong> margem após abertura sem agendamentos.<br/>
                <strong>Buffer Fim:</strong> margem antes de fechar sem agendamentos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Background Image Settings */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
              <Image className="w-5 h-5 text-primary" />
              Imagem de Fundo do Site
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Background Preview */}
            <div className="relative w-full h-40 sm:h-48 rounded-lg overflow-hidden border border-border bg-muted">
              {(backgroundPreview || settings.background_image_url) ? (
                <>
                  <img 
                    src={backgroundPreview || settings.background_image_url || ''} 
                    alt="Background Preview" 
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className={`absolute inset-0 bg-black ${
                      settings.background_overlay_level === 'low' ? 'opacity-30' :
                      settings.background_overlay_level === 'high' ? 'opacity-70' : 'opacity-50'
                    }`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white font-display text-lg sm:text-xl font-bold">{settings.name}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Image className="w-10 h-10 sm:w-12 sm:h-12 opacity-50" />
                  <p className="text-sm mt-2">Nenhuma imagem de fundo</p>
                  <p className="text-xs">Será usado o fundo padrão</p>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBackgroundSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => backgroundInputRef.current?.click()}
                disabled={isUploadingBackground}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingBackground ? 'Enviando...' : 'Carregar Imagem'}
              </Button>
              {settings.background_image_url && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveBackground}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Formatos: JPG, PNG, WEBP. Tamanho máximo: 5MB.
            </p>

            {/* Overlay Level */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label htmlFor="overlay_level" className="text-sm sm:text-base">Intensidade do Overlay</Label>
              <Select
                value={settings.background_overlay_level}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setSettings({ ...settings, background_overlay_level: value })
                }
              >
                <SelectTrigger className="w-full sm:w-48 bg-input border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo (30%)</SelectItem>
                  <SelectItem value="medium">Médio (50%)</SelectItem>
                  <SelectItem value="high">Alto (70%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O overlay escuro garante legibilidade do texto sobre a imagem.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
              <MessageCircle className="w-5 h-5 text-primary" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm sm:text-base">Número do WhatsApp</Label>
              <Input
                id="whatsapp"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="+258 84 000 0000"
                className="bg-input border-border w-full"
              />
              <p className="text-xs text-muted-foreground">
                Este número será usado para receber confirmações de agendamento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payments & Confirmation */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
              <CreditCard className="w-5 h-5 text-primary" />
              Pagamentos & Confirmação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Required Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/20">
              <div className="space-y-0.5">
                <Label htmlFor="payment_required" className="text-base font-medium cursor-pointer">
                  Pagamento obrigatório para confirmar agendamento
                </Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativado, os clientes devem validar o código de transação antes de enviar a confirmação no WhatsApp.
                </p>
              </div>
              <Switch
                id="payment_required"
                checked={settings.payment_required || false}
                onCheckedChange={(checked) => setSettings({ ...settings, payment_required: checked })}
              />
            </div>

            {/* Show payment methods only when payment is required */}
            {settings.payment_required && (
              <>
                {/* M-Pesa */}
                <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium">M-Pesa</p>
                        <p className="text-xs text-muted-foreground">Vodacom Moçambique (84/85)</p>
                      </div>
                    </div>
                    <Checkbox
                      id="mpesa_enabled"
                      checked={settings.payment_methods_enabled?.includes('mpesa') || false}
                      onCheckedChange={(checked) => {
                        const methods = settings.payment_methods_enabled || [];
                        if (checked) {
                          setSettings({ ...settings, payment_methods_enabled: [...methods, 'mpesa'] });
                        } else {
                          setSettings({ ...settings, payment_methods_enabled: methods.filter(m => m !== 'mpesa') });
                        }
                      }}
                    />
                  </div>
                  {settings.payment_methods_enabled?.includes('mpesa') && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="mpesa_number" className="text-sm">Número M-Pesa para receber pagamentos</Label>
                      <Input
                        id="mpesa_number"
                        value={settings.mpesa_number || ''}
                        onChange={(e) => setSettings({ ...settings, mpesa_number: e.target.value })}
                        placeholder="84 XXX XXXX ou 85 XXX XXXX"
                        className="bg-input border-border"
                      />
                    </div>
                  )}
                </div>

                {/* eMola */}
                <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-secondary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-medium">eMola</p>
                        <p className="text-xs text-muted-foreground">Movitel Moçambique (86/87)</p>
                      </div>
                    </div>
                    <Checkbox
                      id="emola_enabled"
                      checked={settings.payment_methods_enabled?.includes('emola') || false}
                      onCheckedChange={(checked) => {
                        const methods = settings.payment_methods_enabled || [];
                        if (checked) {
                          setSettings({ ...settings, payment_methods_enabled: [...methods, 'emola'] });
                        } else {
                          setSettings({ ...settings, payment_methods_enabled: methods.filter(m => m !== 'emola') });
                        }
                      }}
                    />
                  </div>
                  {settings.payment_methods_enabled?.includes('emola') && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="emola_number" className="text-sm">Número eMola para receber pagamentos</Label>
                      <Input
                        id="emola_number"
                        value={settings.emola_number || ''}
                        onChange={(e) => setSettings({ ...settings, emola_number: e.target.value })}
                        placeholder="86 XXX XXXX ou 87 XXX XXXX"
                        className="bg-input border-border"
                      />
                    </div>
                  )}
                </div>

                {/* Warning if no payment method selected */}
                {settings.payment_required && settings.payment_methods_enabled?.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      Ative pelo menos um método de pagamento ou desative o pagamento obrigatório.
                    </p>
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-muted-foreground">
              {settings.payment_required 
                ? 'Os clientes verão instruções para transferir o valor e colar a mensagem de confirmação antes de enviar no WhatsApp.'
                : 'Sem pagamento obrigatório, o cliente verá apenas uma mensagem de confirmação simples após agendar.'}
            </p>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
              <Palette className="w-5 h-5 text-primary" />
              Cores Personalizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color" className="text-sm">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0 flex-shrink-0"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="bg-input border-border flex-1 text-sm"
                    placeholder="#D4AF37"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color" className="text-sm">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0 flex-shrink-0"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="bg-input border-border flex-1 text-sm"
                    placeholder="#1a1a2e"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="background_color" className="text-sm">Cor de Fundo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="background_color"
                    value={settings.background_color}
                    onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0 flex-shrink-0"
                  />
                  <Input
                    value={settings.background_color}
                    onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                    className="bg-input border-border flex-1 text-sm"
                    placeholder="#0f0f1a"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_color" className="text-sm">Cor do Texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="text_color"
                    value={settings.text_color}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0 flex-shrink-0"
                  />
                  <Input
                    value={settings.text_color}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="bg-input border-border flex-1 text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estas cores serão aplicadas na página de agendamento dos seus clientes.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Save Button for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:hidden pb-safe">
        <Button 
          variant="gold" 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}

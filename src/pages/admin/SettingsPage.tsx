import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Save, MessageCircle, Palette, Image, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    
    // First get user's barbershop_id from user_roles
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo inválido',
        description: 'Apenas JPG, PNG e WEBP são permitidos.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 2MB.',
        variant: 'destructive',
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${settings.id}/background.${fileExt}`;

    // Delete old file if exists
    if (settings.background_image_url) {
      const oldPath = settings.background_image_url.split('/backgrounds/')[1];
      if (oldPath) {
        await supabase.storage.from('backgrounds').remove([oldPath]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('backgrounds')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Erro no upload',
        description: 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
      setIsUploading(false);
      setPreviewImage(null);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('backgrounds')
      .getPublicUrl(fileName);

    setSettings({ ...settings, background_image_url: publicUrl });
    setPreviewImage(null);
    setIsUploading(false);

    toast({
      title: 'Imagem carregada',
      description: 'Clique em Salvar para aplicar as alterações.',
    });
  };

  const handleRemoveImage = async () => {
    if (!settings?.background_image_url) return;

    const path = settings.background_image_url.split('/backgrounds/')[1];
    if (path) {
      await supabase.storage.from('backgrounds').remove([path]);
    }

    setSettings({ ...settings, background_image_url: null });
    setPreviewImage(null);

    toast({
      title: 'Imagem removida',
      description: 'Clique em Salvar para aplicar as alterações.',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-6">
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
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Bem-vindo! Configure seu negócio para começar.</p>
            <Button 
              className="mt-4" 
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-foreground">Configurações</h1>
        <Button variant="gold" onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Business Info */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Informações do Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">{labels.businessName}</Label>
                <Input
                  id="business_name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL (slug)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/b/</span>
                  <Input
                    id="slug"
                    value={settings.slug}
                    onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="bg-input border-border"
                    placeholder={labels.slugPlaceholder}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL do Logotipo (opcional)</Label>
              <Input
                id="logo_url"
                value={settings.logo_url || ''}
                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })}
                className="bg-input border-border"
                placeholder="https://exemplo.com/logo.png"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_time">Horário de Abertura</Label>
                <Input
                  id="opening_time"
                  type="time"
                  value={settings.opening_time || '09:00'}
                  onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time">Horário de Fechamento</Label>
                <Input
                  id="closing_time"
                  type="time"
                  value={settings.closing_time || '18:00'}
                  onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Background Image - Configurações do Site */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Configurações do Site
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Imagem de Fundo do Site</Label>
              
              {/* Preview */}
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border bg-muted">
                {(previewImage || settings.background_image_url) ? (
                  <>
                    <img 
                      src={previewImage || settings.background_image_url || ''} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay preview */}
                    <div 
                      className={`absolute inset-0 bg-black ${
                        settings.background_overlay_level === 'low' ? 'opacity-30' :
                        settings.background_overlay_level === 'high' ? 'opacity-70' : 'opacity-50'
                      }`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white font-display text-xl font-bold">{settings.name}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Image className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma imagem de fundo</p>
                    <p className="text-xs">Será usado o fundo padrão</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Enviando...' : 'Carregar Imagem'}
                </Button>
                {settings.background_image_url && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Formatos: JPG, PNG, WEBP. Tamanho máximo: 2MB.
              </p>
            </div>

            {/* Overlay Level */}
            <div className="space-y-3">
              <Label htmlFor="overlay_level">Intensidade do Overlay</Label>
              <Select
                value={settings.background_overlay_level}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setSettings({ ...settings, background_overlay_level: value })
                }
              >
                <SelectTrigger className="w-48 bg-input border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo (30%)</SelectItem>
                  <SelectItem value="medium">Médio (50%)</SelectItem>
                  <SelectItem value="high">Alto (70%)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                O overlay escuro garante a legibilidade do texto sobre a imagem.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número do WhatsApp</Label>
              <Input
                id="whatsapp"
                value={settings.whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="+258 84 000 0000"
                className="bg-input border-border"
              />
              <p className="text-sm text-muted-foreground">
                Este número será usado para receber confirmações de agendamento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Cores Personalizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="bg-input border-border flex-1"
                    placeholder="#D4AF37"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={settings.secondary_color}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="bg-input border-border flex-1"
                    placeholder="#1a1a2e"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="background_color">Cor de Fundo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="background_color"
                    value={settings.background_color}
                    onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={settings.background_color}
                    onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                    className="bg-input border-border flex-1"
                    placeholder="#0f0f1a"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_color">Cor do Texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="text_color"
                    value={settings.text_color}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={settings.text_color}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="bg-input border-border flex-1"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Estas cores serão aplicadas na página de agendamento dos seus clientes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

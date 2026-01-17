import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Star, Trash2, GripVertical, Loader2 } from 'lucide-react';

interface ServiceImage {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
}

interface ServiceImageManagerProps {
  serviceId: string | null;
  barbershopId: string;
  onImagesChange?: (images: ServiceImage[]) => void;
}

export function ServiceImageManager({ serviceId, barbershopId, onImagesChange }: ServiceImageManagerProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing images
  const fetchImages = useCallback(async () => {
    if (!serviceId) {
      setImages([]);
      return;
    }

    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('service_images')
      .select('id, image_url, is_cover, sort_order')
      .eq('service_id', serviceId)
      .order('is_cover', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching images:', error);
    } else {
      setImages(data || []);
      onImagesChange?.(data || []);
    }
    setIsLoading(false);
  }, [serviceId, onImagesChange]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Upload multiple images
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !serviceId) return;

    setIsUploading(true);
    const uploadedImages: ServiceImage[] = [];
    const maxSortOrder = images.length > 0 ? Math.max(...images.map(i => i.sort_order)) : -1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      const filePath = `${barbershopId}/${serviceId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('service_images')
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Erro no upload',
          description: `Falha ao enviar ${file.name}`,
          variant: 'destructive',
        });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('service_images')
        .getPublicUrl(filePath);

      // Insert into database
      const isCover = images.length === 0 && i === 0;
      const { data: insertData, error: insertError } = await (supabase as any)
        .from('service_images')
        .insert({
          service_id: serviceId,
          barbershop_id: barbershopId,
          image_url: urlData.publicUrl,
          is_cover: isCover,
          sort_order: maxSortOrder + 1 + i,
        })
        .select('id, image_url, is_cover, sort_order')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
      } else if (insertData) {
        uploadedImages.push(insertData);
      }
    }

    if (uploadedImages.length > 0) {
      toast({
        title: 'Sucesso',
        description: `${uploadedImages.length} foto(s) adicionada(s).`,
      });
      await fetchImages();
    }

    setIsUploading(false);
    event.target.value = '';
  };

  // Set image as cover
  const setCover = async (imageId: string) => {
    const { error } = await (supabase as any)
      .from('service_images')
      .update({ is_cover: true })
      .eq('id', imageId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível definir como capa.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Capa definida' });
      await fetchImages();
    }
  };

  // Delete image
  const deleteImage = async (image: ServiceImage) => {
    // Extract path from URL
    const urlParts = image.image_url.split('/service_images/');
    const filePath = urlParts[1];

    if (filePath) {
      await supabase.storage.from('service_images').remove([filePath]);
    }

    const { error } = await (supabase as any)
      .from('service_images')
      .delete()
      .eq('id', image.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a foto.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Foto removida' });
      await fetchImages();
    }
  };

  // Move image (reorder)
  const moveImage = async (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    // Swap
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];

    // Update sort_order
    for (let i = 0; i < newImages.length; i++) {
      newImages[i].sort_order = i;
    }

    // Update database
    for (const img of newImages) {
      await (supabase as any)
        .from('service_images')
        .update({ sort_order: img.sort_order })
        .eq('id', img.id);
    }

    setImages(newImages);
    onImagesChange?.(newImages);
  };

  if (!serviceId) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground text-sm">
        Salve o serviço primeiro para adicionar fotos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <ImagePlus className="w-4 h-4" />
          Fotos do Serviço ({images.length})
        </Label>
        <div className="relative">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button type="button" size="sm" variant="outline" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 mr-2" />
                Adicionar Fotos
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <div className="p-6 bg-muted/30 rounded-lg text-center text-muted-foreground text-sm">
          Nenhuma foto adicionada. Clique em "Adicionar Fotos" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.is_cover ? 'border-primary' : 'border-border'
              }`}
            >
              <img
                src={image.image_url}
                alt={`Foto ${index + 1}`}
                className="w-full h-24 object-cover"
                loading="lazy"
              />
              
              {/* Cover badge */}
              {image.is_cover && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Capa
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_cover && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setCover(image.id)}
                    title="Definir como capa"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                
                {index > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => moveImage(index, 'up')}
                    title="Mover para cima"
                  >
                    <GripVertical className="w-4 h-4 rotate-90" />
                  </Button>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => deleteImage(image)}
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

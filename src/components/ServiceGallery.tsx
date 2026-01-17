import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface ServiceImage {
  id: string;
  image_url: string;
  is_cover: boolean;
  sort_order: number;
}

interface ServiceGalleryProps {
  serviceId: string;
  serviceName: string;
  variant?: 'thumbnail' | 'full';
}

export function ServiceGallery({ serviceId, serviceName, variant = 'thumbnail' }: ServiceGalleryProps) {
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchImages();
  }, [serviceId]);

  const fetchImages = async () => {
    setIsLoading(true);
    // Using direct query - table created in migration
    const { data, error } = await (supabase as any)
      .from('service_images')
      .select('id, image_url, is_cover, sort_order')
      .eq('service_id', serviceId)
      .order('is_cover', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(8);

    if (!error && data) {
      setImages(data as ServiceImage[]);
    }
    setIsLoading(false);
  };

  const coverImage = images.find(img => img.is_cover) || images[0];

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    } else {
      setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-20 bg-muted/30 rounded-lg animate-pulse" />
    );
  }

  if (images.length === 0) {
    return null;
  }

  // Thumbnail variant: show only cover
  if (variant === 'thumbnail') {
    return (
      <div 
        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setSelectedIndex(0)}
      >
        <img
          src={coverImage?.image_url}
          alt={serviceName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Lightbox */}
        <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
          <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
            <VisuallyHidden.Root>
              <DialogTitle>Galeria de {serviceName}</DialogTitle>
            </VisuallyHidden.Root>
            
            <div className="relative">
              {selectedIndex !== null && (
                <img
                  src={images[selectedIndex]?.image_url}
                  alt={`${serviceName} - foto ${selectedIndex + 1}`}
                  className="w-full max-h-[80vh] object-contain"
                />
              )}
              
              {/* Navigation */}
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateImage('prev')}
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                    onClick={() => navigateImage('next')}
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </Button>
                </>
              )}

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {(selectedIndex ?? 0) + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto justify-center">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-12 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      idx === selectedIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full variant: show grid
  return (
    <div className="space-y-3">
      {/* Cover image large */}
      {coverImage && (
        <div
          className="w-full h-48 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setSelectedIndex(0)}
        >
          <img
            src={coverImage.image_url}
            alt={serviceName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.slice(0, 8).map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(idx)}
              className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-90 transition-opacity border border-border"
            >
              <img
                src={img.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <VisuallyHidden.Root>
            <DialogTitle>Galeria de {serviceName}</DialogTitle>
          </VisuallyHidden.Root>
          
          <div className="relative">
            {selectedIndex !== null && (
              <img
                src={images[selectedIndex]?.image_url}
                alt={`${serviceName} - foto ${selectedIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            
            {images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </Button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {(selectedIndex ?? 0) + 1} / {images.length}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 p-4 overflow-x-auto justify-center">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-12 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    idx === selectedIndex ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

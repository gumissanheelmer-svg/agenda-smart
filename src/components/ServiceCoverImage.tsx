import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ServiceCoverImageProps {
  serviceId: string;
  serviceName: string;
  className?: string;
}

export function ServiceCoverImage({ serviceId, serviceName, className = '' }: ServiceCoverImageProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCover();
  }, [serviceId]);

  const fetchCover = async () => {
    // Using direct query - table created in migration
    const { data, error } = await (supabase as any)
      .from('service_images')
      .select('image_url')
      .eq('service_id', serviceId)
      .eq('is_cover', true)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setCoverUrl(data.image_url);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return <div className={`bg-muted/30 animate-pulse rounded ${className}`} />;
  }

  if (!coverUrl) {
    return null;
  }

  return (
    <img
      src={coverUrl}
      alt={serviceName}
      className={`object-cover rounded ${className}`}
      loading="lazy"
    />
  );
}

import { useEffect, ReactNode } from 'react';
import { useBarbershop } from '@/hooks/useBarbershop';

function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.split(' ');
  const h = parts[0];
  const s = parts[1];
  const l = parseInt(parts[2]);
  const newL = Math.max(0, Math.min(100, l + amount));
  return `${h} ${s} ${newL}%`;
}

interface DynamicThemeProviderProps {
  children: ReactNode;
}

export function DynamicThemeProvider({ children }: DynamicThemeProviderProps) {
  const { barbershop } = useBarbershop();

  useEffect(() => {
    if (!barbershop) {
      // Reset to default theme
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--gold');
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-border');
      root.style.removeProperty('--sidebar-ring');
      return;
    }

    const root = document.documentElement;
    
    // Convert colors to HSL
    const primaryHsl = hexToHsl(barbershop.primary_color);
    const secondaryHsl = hexToHsl(barbershop.secondary_color);
    const backgroundHsl = hexToHsl(barbershop.background_color);
    const textHsl = hexToHsl(barbershop.text_color);

    // Apply dynamic CSS variables
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--primary-foreground', backgroundHsl);
    root.style.setProperty('--accent', primaryHsl);
    root.style.setProperty('--accent-foreground', backgroundHsl);
    root.style.setProperty('--ring', primaryHsl);
    root.style.setProperty('--gold', primaryHsl);

    root.style.setProperty('--background', backgroundHsl);
    root.style.setProperty('--foreground', textHsl);

    root.style.setProperty('--card', adjustLightness(backgroundHsl, 3));
    root.style.setProperty('--card-foreground', textHsl);

    root.style.setProperty('--secondary', secondaryHsl);
    root.style.setProperty('--secondary-foreground', textHsl);

    root.style.setProperty('--muted', adjustLightness(backgroundHsl, 8));
    root.style.setProperty('--muted-foreground', adjustLightness(textHsl, -30));

    root.style.setProperty('--border', adjustLightness(secondaryHsl, 10));
    
    // Sidebar variables
    root.style.setProperty('--sidebar-background', adjustLightness(backgroundHsl, 3));
    root.style.setProperty('--sidebar-foreground', textHsl);
    root.style.setProperty('--sidebar-primary', primaryHsl);
    root.style.setProperty('--sidebar-primary-foreground', backgroundHsl);
    root.style.setProperty('--sidebar-accent', secondaryHsl);
    root.style.setProperty('--sidebar-border', adjustLightness(secondaryHsl, 10));
    root.style.setProperty('--sidebar-ring', primaryHsl);

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--muted');
      root.style.removeProperty('--muted-foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--gold');
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-primary-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-border');
      root.style.removeProperty('--sidebar-ring');
    };
  }, [barbershop]);

  return <>{children}</>;
}

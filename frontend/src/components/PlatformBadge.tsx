import { Badge } from '@/components/ui/badge';

interface PlatformBadgeProps {
  platform: string;
}

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const colors: Record<string, string> = {
    Nuvemshop: 'bg-blue-500/10 text-blue-500 border-blue-500',
    Shopify: 'bg-green-500/10 text-green-500 border-green-500',
    Tray: 'bg-orange-500/10 text-orange-500 border-orange-500',
    'Loja Integrada': 'bg-purple-500/10 text-purple-500 border-purple-500',
  };
  const className = colors[platform] ?? 'bg-gray-500/10 text-gray-500 border-gray-500';
  return <Badge variant="outline" className={className}>{platform}</Badge>;
}

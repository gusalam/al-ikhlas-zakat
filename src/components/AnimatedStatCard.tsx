import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCountUp } from '@/hooks/useAnimationLoop';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  isCurrency?: boolean;
  icon: LucideIcon;
  color?: string;
  loopInterval?: number;
}

export default function AnimatedStatCard({
  label,
  value,
  suffix = '',
  prefix = '',
  isCurrency = false,
  icon: Icon,
  color = 'text-primary',
  loopInterval = 8000,
}: AnimatedStatCardProps) {
  const animatedValue = useCountUp(value, 1500, loopInterval);

  const display = isCurrency
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(animatedValue)
    : `${prefix}${animatedValue.toLocaleString('id-ID')}${suffix}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg md:text-xl font-bold">{display}</p>
      </CardContent>
    </Card>
  );
}

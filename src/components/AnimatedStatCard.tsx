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
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${color}`} />
          <span className="text-[11px] sm:text-sm text-muted-foreground leading-tight">{label}</span>
        </div>
        <p className="text-sm sm:text-lg md:text-xl font-bold whitespace-nowrap" style={{ wordBreak: 'keep-all' }}>
          {display}
        </p>
      </CardContent>
    </Card>
  );
}

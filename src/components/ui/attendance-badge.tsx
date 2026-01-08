import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX, Clock, CalendarOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AttendanceStatus = 'present' | 'absent' | 'pending' | 'time_off';

interface AttendanceBadgeProps {
  status: AttendanceStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  present: {
    label: 'Presente',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    Icon: UserCheck,
  },
  absent: {
    label: 'Ausente',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
    Icon: UserX,
  },
  pending: {
    label: 'Pendente',
    bgClass: 'bg-yellow-500/20',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
    Icon: Clock,
  },
  time_off: {
    label: 'Folga',
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
    Icon: CalendarOff,
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizeConfig = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function AttendanceBadge({ 
  status, 
  showIcon = false, 
  size = 'md',
  className 
}: AttendanceBadgeProps) {
  const config = statusConfig[status];
  const { Icon } = config;

  return (
    <Badge 
      className={cn(
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeConfig[size],
        'flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizeConfig[size]} />}
      {config.label}
    </Badge>
  );
}

export function AttendanceIndicator({ status }: { status: AttendanceStatus }) {
  const colorClass = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    pending: 'bg-yellow-500',
    time_off: 'bg-gray-500',
  };

  return (
    <div className={cn('w-3 h-3 rounded-full', colorClass[status])} />
  );
}

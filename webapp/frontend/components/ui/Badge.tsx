import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'destructive' | 'secondary';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    secondary: 'bg-secondary text-secondary-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

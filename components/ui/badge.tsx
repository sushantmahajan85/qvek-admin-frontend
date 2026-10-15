import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        green: 'border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400',
        amber: 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        red: 'border-red-600/30 bg-red-500/10 text-red-700 dark:text-red-400',
        slate: 'border-edge bg-hover text-ink',
        blue: 'border-blue-600/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
      },
    },
    defaultVariants: { tone: 'slate' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

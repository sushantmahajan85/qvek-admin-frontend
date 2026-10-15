import * as React from 'react';
import { cn } from '@/lib/utils';

const field =
  'flex h-10 w-full rounded-lg border border-edge bg-card px-3 text-sm transition-colors placeholder:text-muted2 hover:border-silver focus-visible:outline-none focus-visible:border-graphite focus-visible:ring-2 focus-visible:ring-silver/30 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:border-softwhite';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(field, 'py-1', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-20 py-2', className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-hover', className)} {...props} />;
}

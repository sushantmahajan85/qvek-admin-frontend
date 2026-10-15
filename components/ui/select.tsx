'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-lg border border-edge bg-card pl-3 pr-9 text-sm transition-colors hover:border-silver focus-visible:outline-none focus-visible:border-graphite focus-visible:ring-2 focus-visible:ring-silver/30 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:border-softwhite',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted2" />
    </span>
  ),
);
Select.displayName = 'Select';

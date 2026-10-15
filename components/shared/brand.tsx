import Image from 'next/image';
import { cn } from '@/lib/utils';

// Qvek brandmark. Source: /public/images/qvek-logo.png (dark mark on transparent).
// `dark:invert` keeps it visible on the dark theme without a second asset.
export function QvekMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/qvek-logo.png"
      alt="Qvek"
      width={size}
      height={size}
      className={cn('dark:invert', className)}
      priority
    />
  );
}

export function QvekBrand({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <QvekMark size={size} />
      <span className="text-lg font-bold tracking-tight">
        Qvek
      </span>
    </span>
  );
}

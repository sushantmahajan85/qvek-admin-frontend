import { ICON_PATHS } from "@/lib/qvek/icon-paths";
import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

/** Same inline SVG icon markup as the prototype (`QV.icon`): 24px grid, 2px round stroke. */
export function Icon({ name, size = 20, className }: IconProps) {
  const body = ICON_PATHS[name] || ICON_PATHS.info;
  return (
    <svg
      className={cn("ic", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

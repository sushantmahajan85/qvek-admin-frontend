import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Icon } from "@/components/qvek/icon";
import { cn } from "@/lib/utils";

/* shadcn-style Badge / Flag mapped onto the Qvek admin `.badge` + `.flag` classes. */
const badgeVariants = cva("badge", {
  variants: {
    tone: {
      green: "badge--green",
      amber: "badge--amber",
      red: "badge--red",
      blue: "badge--blue",
      violet: "badge--violet",
      grey: "badge--grey",
      outline: "badge--outline",
    },
  },
  defaultVariants: { tone: "grey" },
});

type BadgeProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof badgeVariants> & {
    /** Replaces the leading status dot with an icon. */
    icon?: string | null;
    children?: React.ReactNode;
  };

function Badge({ className, tone, icon, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), icon && "badge--noicon", className)} {...props}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

const flagVariants = cva("flag", {
  variants: {
    tone: {
      amber: "",
      red: "flag--red",
      blue: "flag--blue",
      grey: "flag--grey",
    },
  },
  defaultVariants: { tone: "amber" },
});

type FlagProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof flagVariants> & { icon: string; children?: React.ReactNode };

function Flag({ className, tone, icon, children, ...props }: FlagProps) {
  return (
    <span data-slot="flag" className={cn(flagVariants({ tone }), className)} {...props}>
      <Icon name={icon} size={13} />
      {children}
    </span>
  );
}

export { Badge, Flag, badgeVariants, flagVariants };

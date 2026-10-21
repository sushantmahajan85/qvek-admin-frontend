import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * shadcn-style Button (cva variants + `cn`), mapped onto the Qvek admin design system so the
 * rendered markup/classes are identical to the prototype's `.btn` family.
 */
const buttonVariants = cva("btn", {
  variants: {
    variant: {
      primary: "btn--primary",
      ghost: "btn--ghost",
      subtle: "btn--subtle",
      danger: "btn--danger",
      "danger-ghost": "btn--danger-ghost",
      "warn-ghost": "btn--warn-ghost",
      "green-ghost": "btn--green-ghost",
    },
    size: {
      default: "",
      sm: "btn--sm",
      lg: "btn--lg",
    },
    block: {
      true: "btn--block",
      false: "",
    },
  },
  defaultVariants: {
    variant: "ghost",
    size: "default",
    block: false,
  },
});

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, type = "button", ...props },
  ref,
) {
  return <button ref={ref} data-slot="button" type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
});

export { Button, buttonVariants };
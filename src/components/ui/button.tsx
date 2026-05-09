"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { playChime } from "@/lib/sfx";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_8px_24px_oklch(from_var(--primary)_l_c_h/0.3)] hover:brightness-110 active:scale-[0.98]",
        outline:
          "border border-foreground/20 text-foreground bg-transparent hover:bg-foreground/5",
        ghost: "hover:bg-foreground/5 text-foreground",
        link: "underline-offset-4 hover:underline text-foreground",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-full px-4",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClickCapture, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const handleClickCapture = (e: React.MouseEvent<HTMLButtonElement>) => {
      playChime();
      onClickCapture?.(e);
    };
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClickCapture={handleClickCapture}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

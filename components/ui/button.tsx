import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#FFB7B2] text-[#292524] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:brightness-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[#292524] dark:text-[#FDFCF8] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:bg-stone-50 dark:hover:bg-stone-800",
        secondary:
          "bg-[#E8EFE8] dark:bg-[#252D27] text-[#292524] dark:text-[#FDFCF8] hover:bg-[#E8EFE8]/80 dark:hover:bg-[#2E3830]",
        ghost: "text-[#292524] dark:text-[#FDFCF8] hover:bg-[#E8EFE8]/60 dark:hover:bg-stone-800 hover:text-[#292524] dark:hover:text-[#FDFCF8]",
        link: "text-[#292524] dark:text-[#FDFCF8] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-full px-4",
        lg: "h-12 rounded-full px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

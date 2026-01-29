"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Textarea, type TextareaProps } from "@/components/ui/textarea"

const inputGroupVariants = cva(
  "flex flex-col w-full rounded-md border border-input bg-transparent text-base shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring md:text-sm",
  {
    variants: {
      variant: {
        default: "",
        ghost: "border-none shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface InputGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupVariants> {}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(inputGroupVariants({ variant }), className)}
      {...props}
    />
  )
)
InputGroup.displayName = "InputGroup"

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end"
}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, align = "inline-end", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex shrink-0 items-center gap-1 px-2",
        align === "inline-start" && "order-first",
        align === "inline-end" && "order-last",
        align === "block-start" && "order-first w-full border-b py-2",
        align === "block-end" && "order-last w-full border-t py-2",
        className
      )}
      {...props}
    />
  )
)
InputGroupAddon.displayName = "InputGroupAddon"

export type InputGroupButtonProps = ButtonProps

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  InputGroupButtonProps
>(({ className, variant = "ghost", size = "sm", ...props }, ref) => (
  <Button
    ref={ref}
    className={cn("shrink-0", className)}
    variant={variant}
    size={size}
    {...props}
  />
))
InputGroupButton.displayName = "InputGroupButton"

export type InputGroupTextareaProps = TextareaProps

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  InputGroupTextareaProps
>(({ className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={cn(
      "min-h-0 flex-1 resize-none border-0 bg-transparent p-3 shadow-none focus-visible:ring-0",
      className
    )}
    {...props}
  />
))
InputGroupTextarea.displayName = "InputGroupTextarea"

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
  inputGroupVariants,
}

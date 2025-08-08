import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 touch-target md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:ring-ring",
        error: "border-destructive focus-visible:ring-destructive text-destructive",
        success: "border-success focus-visible:ring-success",
        warning: "border-warning focus-visible:ring-warning",
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-10 px-3",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
  error?: string
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    type, 
    leftIcon, 
    rightIcon, 
    loading, 
    error, 
    helperText,
    disabled,
    ...props 
  }, ref) => {
    const hasError = !!error;
    const finalVariant = hasError ? "error" : variant;
    const isDisabled = disabled || loading;

    const inputElement = (
      <input
        type={type}
        className={cn(
          inputVariants({ variant: finalVariant, size, className }),
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          loading && "animate-pulse"
        )}
        ref={ref}
        disabled={isDisabled}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${props.id}-error` : 
          helperText ? `${props.id}-helper` : 
          undefined
        }
        {...props}
      />
    )

    if (leftIcon || rightIcon || loading) {
      return (
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
              {leftIcon}
            </div>
          )}
          
          {inputElement}
          
          {/* Right icon or loading spinner */}
          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
              {loading ? (
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                rightIcon
              )}
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <p
              id={`${props.id}-error`}
              className="mt-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          
          {/* Helper text */}
          {helperText && !error && (
            <p
              id={`${props.id}-helper`}
              className="mt-2 text-sm text-muted-foreground"
            >
              {helperText}
            </p>
          )}
        </div>
      )
    }

    return (
      <div>
        {inputElement}
        
        {/* Error message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {/* Helper text */}
        {helperText && !error && (
          <p
            id={`${props.id}-helper`}
            className="mt-2 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

// Form field wrapper component
export interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  helperText?: string
  children: React.ReactNode
  className?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, required, error, helperText, children, className }, ref) => {
    const id = React.useId()
    
    return (
      <div ref={ref} className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        {React.cloneElement(children as React.ReactElement, {
          id,
          error,
          helperText,
        })}
      </div>
    )
  }
)
FormField.displayName = "FormField"

// Search input component
export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onSearch?: (value: string) => void
  clearable?: boolean
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, clearable = true, rightIcon, ...props }, ref) => {
    const [value, setValue] = React.useState(props.defaultValue || '')
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      props.onChange?.(e)
      onSearch?.(newValue)
    }
    
    const handleClear = () => {
      setValue('')
      onSearch?.('')
    }
    
    const searchIcon = (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    )
    
    const clearIcon = value && clearable ? (
      <button
        type="button"
        onClick={handleClear}
        className="hover:text-foreground transition-colors"
        aria-label="Clear search"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    ) : rightIcon
    
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={searchIcon}
        rightIcon={clearIcon}
        {...props}
        value={value}
        onChange={handleChange}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { Input, FormField, SearchInput, inputVariants }
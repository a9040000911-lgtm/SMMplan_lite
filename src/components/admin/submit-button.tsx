'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@heroui/react';
import React from 'react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  confirmMessage?: string;
}

export function SubmitButton({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = '', 
  confirmMessage,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      variant={variant as any}
      size={size as any}
      className={className} 
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
        }
        props.onClick?.(e);
      }}
      {...props}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" color="current" /> 
          <span>Выполняется...</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

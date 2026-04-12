import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';

interface AccessibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleDialog({
  open,
  onOpenChange,
  title = "Dialog",
  description = "Dialog content",
  hideTitle = false,
  hideDescription = true,
  children,
  className = ""
}: AccessibleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          {hideTitle ? (
            <VisuallyHidden>
              <DialogTitle>{title}</DialogTitle>
            </VisuallyHidden>
          ) : (
            <DialogTitle>{title}</DialogTitle>
          )}
          
          {hideDescription ? (
            <VisuallyHidden>
              <DialogDescription>{description}</DialogDescription>
            </VisuallyHidden>
          ) : (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        {children}
      </DialogContent>
    </Dialog>
  );
}
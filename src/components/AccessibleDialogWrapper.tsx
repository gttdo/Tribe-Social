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
  /** Custom aria-label for the dialog content */
  ariaLabel?: string;
  /** Custom aria-description for the dialog content */
  ariaDescription?: string;
}

/**
 * A wrapper component that ensures all dialogs have proper accessibility compliance.
 * Automatically handles DialogTitle and DialogDescription requirements.
 * 
 * @example
 * <AccessibleDialogWrapper
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Settings"
 *   description="Manage your account settings"
 *   hideTitle={false} // Show the title visually
 * >
 *   <div>Dialog content here</div>
 * </AccessibleDialogWrapper>
 */
export function AccessibleDialogWrapper({
  open,
  onOpenChange,
  title = "Dialog",
  description = "Dialog content",
  hideTitle = false,
  hideDescription = false,
  children,
  className,
  ariaLabel,
  ariaDescription
}: AccessibleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={className}
        aria-label={ariaLabel || title}
        aria-description={ariaDescription || description}
      >
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
          ) : description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <VisuallyHidden>
              <DialogDescription>Dialog content</DialogDescription>
            </VisuallyHidden>
          )}
        </DialogHeader>
        
        {children}
      </DialogContent>
    </Dialog>
  );
}
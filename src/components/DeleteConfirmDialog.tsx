import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Post?",
  description = "This action cannot be undone. Your post will be permanently deleted from your profile and removed from all feeds.",
  confirmText = "Delete Post",
  cancelText = "Cancel",
  isDeleting = false
}: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    if (!isDeleting) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-midnight-black/95 border-neon-lilac/20 max-w-md mx-4">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-glitch-red/10 border border-glitch-red/20">
              <Trash2 className="w-5 h-5 text-glitch-red" />
            </div>
            <AlertDialogTitle className="text-pearl-white font-headline text-lg">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-lavender font-body leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 mt-6">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isDeleting}
            className="bg-transparent border border-muted-lavender/20 text-muted-lavender hover:bg-muted-lavender/5 hover:text-pearl-white font-body transition-all duration-200"
          >
            {cancelText}
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-glitch-red/90 hover:bg-glitch-red text-pearl-white border-0 font-body transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-pearl-white/30 border-t-pearl-white rounded-full animate-spin" />
                Deleting...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
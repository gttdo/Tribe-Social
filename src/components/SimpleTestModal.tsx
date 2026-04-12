import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { X } from 'lucide-react';

interface SimpleTestModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
}

export function SimpleTestModal({ isOpen, onClose, title }: SimpleTestModalProps) {
  console.log(`🎭 ${title} modal is rendering!`);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-midnight-black border-muted-lavender/30">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl text-pearl-white">
            {title} Test Modal
          </DialogTitle>
          <DialogDescription className="text-muted-lavender font-body">
            This is a simple test modal to verify that modals are working properly and accessible.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-muted-lavender font-body">
            This is a simple test modal to verify that modals are working properly.
            If you can see this, then modal rendering is functional.
          </p>
          
          <div className="p-3 bg-neon-lilac/10 border border-neon-lilac/30 rounded-lg">
            <div className="text-neon-lilac text-sm font-medium">
              ✅ Modal is visible and interactive!
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/80 hover:to-electric-blue/80 text-white border-none"
          >
            Close Modal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
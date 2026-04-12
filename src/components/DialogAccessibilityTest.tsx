import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';

export function DialogAccessibilityTest() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Test Dialog Accessibility
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-midnight-black border-muted-lavender/30">
          <DialogHeader>
            <VisuallyHidden>
              <DialogTitle>Accessibility Test Dialog</DialogTitle>
            </VisuallyHidden>
            <DialogDescription className="text-muted-lavender">
              This dialog has proper accessibility attributes including a visually hidden title.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-pearl-white">
              This is a test dialog to verify that all accessibility attributes are properly configured.
            </p>
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Close Dialog
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
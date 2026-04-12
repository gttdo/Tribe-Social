import React, { useState } from 'react';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from './ui/alert-dialog';
import { VisuallyHidden } from './ui/visually-hidden';

export function AccessibilityDialogTest() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [hiddenTitleOpen, setHiddenTitleOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [customAriaOpen, setCustomAriaOpen] = useState(false);

  return (
    <div className="p-8 space-y-4 bg-midnight-black min-h-screen">
      <h1 className="font-headline text-2xl text-pearl-white mb-6">
        Dialog Accessibility Test Suite
      </h1>
      
      <div className="space-y-4">
        {/* Test 1: Basic Dialog with Visible Title/Description */}
        <div>
          <h2 className="font-headline text-lg text-pearl-white mb-2">
            Test 1: Basic Dialog (Visible Title & Description)
          </h2>
          <Button 
            onClick={() => setBasicOpen(true)}
            className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/90"
          >
            Open Basic Dialog
          </Button>
          
          <Dialog open={basicOpen} onOpenChange={setBasicOpen}>
            <DialogContent className="bg-midnight-black border-muted-lavender/30">
              <DialogHeader>
                <DialogTitle className="text-pearl-white font-headline">
                  Basic Test Dialog
                </DialogTitle>
                <DialogDescription className="text-muted-lavender">
                  This dialog has a visible title and description for accessibility testing.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-pearl-white">This is the main content of the dialog.</p>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => setBasicOpen(false)}
                  className="bg-neon-lilac text-midnight-black hover:bg-neon-lilac/90"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Test 2: Dialog with Hidden Title (VisuallyHidden) */}
        <div>
          <h2 className="font-headline text-lg text-pearl-white mb-2">
            Test 2: Dialog with Hidden Title (Screen Reader Only)
          </h2>
          <Button 
            onClick={() => setHiddenTitleOpen(true)}
            className="bg-electric-blue text-midnight-black hover:bg-electric-blue/90"
          >
            Open Hidden Title Dialog
          </Button>
          
          <Dialog open={hiddenTitleOpen} onOpenChange={setHiddenTitleOpen}>
            <DialogContent className="bg-midnight-black border-muted-lavender/30">
              <VisuallyHidden>
                <DialogTitle>Hidden Accessibility Dialog</DialogTitle>
                <DialogDescription>
                  This dialog has a hidden title and description for screen readers only.
                </DialogDescription>
              </VisuallyHidden>
              
              <div className="py-4">
                <h2 className="font-headline text-xl text-pearl-white mb-4">
                  Visual Title (Not for Screen Readers)
                </h2>
                <p className="text-pearl-white">
                  This dialog demonstrates using VisuallyHidden for accessibility while 
                  having different visual content.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={() => setHiddenTitleOpen(false)}
                  className="bg-electric-blue text-midnight-black hover:bg-electric-blue/90"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Test 3: Custom aria-label Dialog */}
        <div>
          <h2 className="font-headline text-lg text-pearl-white mb-2">
            Test 3: Dialog with Custom aria-label
          </h2>
          <Button 
            onClick={() => setCustomAriaOpen(true)}
            className="bg-soft-blush text-midnight-black hover:bg-soft-blush/90"
          >
            Open Custom Aria Dialog
          </Button>
          
          <Dialog open={customAriaOpen} onOpenChange={setCustomAriaOpen}>
            <DialogContent 
              className="bg-midnight-black border-muted-lavender/30"
              aria-label="Custom accessibility label for screen readers"
              aria-description="This dialog uses custom aria attributes instead of DialogTitle"
            >
              <div className="py-4">
                <h2 className="font-headline text-xl text-pearl-white mb-4">
                  Custom Aria Dialog
                </h2>
                <p className="text-pearl-white">
                  This dialog uses custom aria-label and aria-description props 
                  instead of DialogTitle and DialogDescription components.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={() => setCustomAriaOpen(false)}
                  className="bg-soft-blush text-midnight-black hover:bg-soft-blush/90"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Test 4: AlertDialog */}
        <div>
          <h2 className="font-headline text-lg text-pearl-white mb-2">
            Test 4: AlertDialog
          </h2>
          <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button className="bg-glitch-red text-pearl-white hover:bg-glitch-red/90">
                Open Alert Dialog
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-midnight-black border-muted-lavender/30">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-pearl-white font-headline">
                  Alert Dialog Test
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-lavender">
                  This is an alert dialog for testing accessibility features.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-muted-lavender/30 text-muted-lavender hover:text-pearl-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction className="bg-glitch-red text-pearl-white hover:bg-glitch-red/90">
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-8 p-4 bg-midnight-black/50 border border-muted-lavender/20 rounded-lg">
        <h3 className="font-headline text-lg text-pearl-white mb-2">
          Accessibility Testing Instructions
        </h3>
        <ul className="text-muted-lavender space-y-1 text-sm">
          <li>• Use a screen reader (NVDA, JAWS, VoiceOver) to test each dialog</li>
          <li>• Verify each dialog is announced with proper title and description</li>
          <li>• Check that focus is trapped within the dialog when open</li>
          <li>• Ensure keyboard navigation works (Tab, Shift+Tab, Escape)</li>
          <li>• Confirm aria-modal and role attributes are present</li>
        </ul>
      </div>
    </div>
  );
}
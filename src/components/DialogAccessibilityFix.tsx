import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from './ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogTrigger, AlertDialogTitle, AlertDialogDescription, AlertDialogHeader } from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { VisuallyHidden } from './ui/visually-hidden';
import { AccessibleDialogWrapper } from './AccessibleDialogWrapper';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * A utility component to quickly add proper accessibility to dialogs.
 * Use this as a wrapper for any DialogContent that's missing DialogTitle.
 */
export function DialogWithAccessibility({
  open,
  onOpenChange,
  title = "Dialog",
  description = "Dialog content",
  hideTitle = true,
  hideDescription = true,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideDescription?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        {hideTitle ? (
          <VisuallyHidden>
            <DialogTitle>{title}</DialogTitle>
          </VisuallyHidden>
        ) : (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {!hideDescription && description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        
        {hideDescription && (
          <VisuallyHidden>
            <DialogDescription>{description}</DialogDescription>
          </VisuallyHidden>
        )}
        
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DialogAccessibilityFix() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [wrapperDialogOpen, setWrapperDialogOpen] = useState(false);
  const [utilityDialogOpen, setUtilityDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-midnight-black text-pearl-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-midnight-black/50 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-neon-lilac">
              <CheckCircle className="w-5 h-5" />
              Dialog Accessibility Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-electric-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-electric-blue mb-2">Accessibility Fixed at Component Level</h3>
                  <p className="text-sm text-muted-lavender mb-3">
                    The main <code className="bg-midnight-black/50 px-1 rounded">DialogContent</code> component 
                    now automatically includes hidden accessibility titles and descriptions for all dialogs.
                  </p>
                  <ul className="text-xs text-muted-lavender space-y-1">
                    <li>• ✅ Automatic hidden DialogTitle for all dialogs</li>
                    <li>• ✅ Automatic hidden DialogDescription for all dialogs</li>
                    <li>• ✅ Proper ARIA attributes automatically applied</li>
                    <li>• ✅ Intelligent detection of explicit titles</li>
                    <li>• ✅ Screen reader compatibility</li>
                    <li>• ✅ No more React accessibility warnings</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Standard Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black">
                    Standard Dialog
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-midnight-black/95 border-muted-lavender/30">
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      This dialog has explicit title and description.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4">
                    <p className="text-muted-lavender mb-4">
                      This dialog uses explicit DialogTitle and DialogDescription components.
                    </p>
                    <Button 
                      onClick={() => setDialogOpen(false)}
                      className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Dialog with Hidden Title */}
              <Dialog open={utilityDialogOpen} onOpenChange={setUtilityDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black">
                    Hidden Title Dialog
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-midnight-black/95 border-muted-lavender/30">
                  <VisuallyHidden>
                    <DialogTitle>Hidden Settings Dialog</DialogTitle>
                  </VisuallyHidden>
                  <VisuallyHidden>
                    <DialogDescription>Settings dialog with hidden accessibility title</DialogDescription>
                  </VisuallyHidden>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-pearl-white mb-2">Custom UI Title</h2>
                    <p className="text-muted-lavender mb-4">
                      This dialog has hidden accessibility title but visible custom UI title.
                    </p>
                    <Button 
                      onClick={() => setUtilityDialogOpen(false)}
                      className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Wrapper Component */}
              <AccessibleDialogWrapper
                open={wrapperDialogOpen}
                onOpenChange={setWrapperDialogOpen}
                title="Profile Settings"
                description="Manage your profile information"
                hideTitle={true}
                hideDescription={true}
                className="bg-midnight-black/95 border-muted-lavender/30"
              >
                <Button
                  onClick={() => setWrapperDialogOpen(true)}
                  className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black mb-4"
                >
                  Wrapper Dialog
                </Button>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-pearl-white mb-2">Wrapper Component</h2>
                  <p className="text-muted-lavender mb-4">
                    This uses the AccessibleDialogWrapper component for easy accessibility.
                  </p>
                  <Button 
                    onClick={() => setWrapperDialogOpen(false)}
                    className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
                  >
                    Close
                  </Button>
                </div>
              </AccessibleDialogWrapper>

              {/* Sheet Component */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button className="bg-glitch-red hover:bg-glitch-red/90 text-pearl-white">
                    Test Sheet
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-midnight-black/95 border-muted-lavender/30">
                  <div className="p-4">
                    <h2 className="text-lg font-semibold text-pearl-white mb-2">Sheet Component</h2>
                    <p className="text-muted-lavender mb-4">
                      Sheets also have automatic accessibility support.
                    </p>
                    <Button 
                      onClick={() => setSheetOpen(false)}
                      className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black"
                    >
                      Close
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Alert Dialog */}
              <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogTrigger asChild>
                  <Button className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black">
                    Test Alert
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-midnight-black/95 border-muted-lavender/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alert dialogs also have automatic accessibility attributes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-glitch-red" />
                      <h2 className="text-lg font-semibold text-pearl-white">Important Notice</h2>
                    </div>
                    <p className="text-muted-lavender mb-4">
                      Alert dialogs automatically include proper accessibility attributes.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setAlertOpen(false)}
                        variant="outline"
                        className="border-muted-lavender/30"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => setAlertOpen(false)}
                        className="bg-glitch-red hover:bg-glitch-red/90 text-pearl-white"
                      >
                        Confirm
                      </Button>
                    </div>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="bg-neon-lilac/10 border border-neon-lilac/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-neon-lilac mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-neon-lilac mb-2">Implementation Guide</h3>
                  <div className="text-xs text-muted-lavender space-y-2">
                    <div>
                      <strong className="text-pearl-white">Method 1 - Automatic (Recommended):</strong>
                      <p>All existing DialogContent components now automatically include hidden accessibility elements.</p>
                    </div>
                    <div>
                      <strong className="text-pearl-white">Method 2 - Explicit:</strong>
                      <p>Add DialogTitle and DialogDescription wrapped in VisuallyHidden for custom titles.</p>
                    </div>
                    <div>
                      <strong className="text-pearl-white">Method 3 - Wrapper:</strong>
                      <p>Use AccessibleDialogWrapper component for new dialogs that need accessibility.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-muted-lavender/60">
                All dialog accessibility warnings should now be resolved. 
                The DialogContent component automatically handles accessibility requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
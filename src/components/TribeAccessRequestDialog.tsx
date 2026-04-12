import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, Send, Loader2, Users, Info } from 'lucide-react';
import { requestTribeAccess } from '../utils/tribe-access-helpers';
import { toast } from 'sonner@2.0.3';

interface TribeAccessRequestDialogProps {
  tribeId: string;
  tribeName: string;
  children: React.ReactNode;
  onRequestSent?: () => void;
}

export function TribeAccessRequestDialog({ 
  tribeId, 
  tribeName, 
  children, 
  onRequestSent 
}: TribeAccessRequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const response = await requestTribeAccess({
        tribe_id: tribeId,
        message: message.trim()
      });

      if (response.success) {
        toast.success(response.message, {
          description: 'The tribe admins will review your request',
          duration: 5000
        });
        
        setIsOpen(false);
        setMessage('');
        onRequestSent?.();
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (error) {
      const errorMessage = 'Failed to send request. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      setIsOpen(open);
      if (!open) {
        setMessage('');
        setError('');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="bg-midnight-black/95 border-muted-lavender/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-pearl-white font-headline flex items-center gap-2">
            <Shield className="w-5 h-5 text-neon-lilac" />
            Request Access
          </DialogTitle>
          <DialogDescription className="text-muted-lavender font-body">
            Send a request to join <span className="text-soft-blush font-medium">{tribeName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="message" className="text-pearl-white font-body">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Tell the tribe admins why you'd like to join..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              rows={4}
              className="bg-input-background border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/50 resize-none"
            />
            <div className="text-xs text-muted-lavender/70 text-right">
              {message.length}/500
            </div>
          </div>

          <Alert className="bg-electric-blue/10 border-electric-blue/30">
            <Info className="h-4 w-4 text-electric-blue" />
            <AlertDescription className="text-electric-blue/90 font-body text-sm">
              Your request will be sent to the tribe administrators. They will review and respond to your request.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert className="bg-glitch-red/10 border-glitch-red/30">
              <AlertDescription className="text-glitch-red font-body text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="flex-1 text-muted-lavender hover:text-pearl-white border-muted-lavender/30 hover:border-muted-lavender/50"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
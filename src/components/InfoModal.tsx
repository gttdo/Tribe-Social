import React from 'react';
import { X, Sparkles, MessageSquare, Palette, Users, Rocket } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-midnight-black/80 border-muted-lavender/30">
        <DialogHeader>
          <VisuallyHidden>
            <DialogTitle>
              Welcome to Tribe - Your Space, Your People
            </DialogTitle>
          </VisuallyHidden>
          <DialogDescription className="text-muted-lavender text-sm">
            Learn about Tribe Board's features and how to connect with your community, create content, and build your digital world
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative p-6 sm:p-8 md:p-10">
          {/* Close button */}
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-transparent border border-muted-lavender/30 text-muted-lavender hover:bg-muted-lavender/10 hover:text-white rounded-xl transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Header */}
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-neon-lilac/20 to-electric-blue/20 border-2 border-neon-lilac/40 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-neon-lilac" />
            </div>
            
            <div className="space-y-3">
              <h2 className="font-headline text-3xl text-pearl-white">
                ✨ Welcome to Tribe — Your Space, Your People
              </h2>
              <p className="text-muted-lavender font-body text-lg leading-relaxed">
                Tribe is your corner of the internet to connect, create, and completely own your vibe.
              </p>
              <p className="text-electric-blue/90 font-body text-base leading-relaxed">
                Start a Tribe around anything you love — or join one that feels like home.
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-8 mt-8">
            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-electric-blue" />
                  <h3 className="font-headline text-lg text-pearl-white">
                    Post your way
                  </h3>
                </div>
                <p className="text-muted-lavender font-body text-sm pl-9">
                  💬 Quick thoughts, epic pics, videos, or voice drops.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Palette className="w-6 h-6 text-soft-blush" />
                  <h3 className="font-headline text-lg text-pearl-white">
                    Make it yours
                  </h3>
                </div>
                <p className="text-muted-lavender font-body text-sm pl-9">
                  🎨 Change colors, fonts, and themes until your profile feels like you.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-neon-lilac" />
                  <h3 className="font-headline text-lg text-pearl-white">
                    Find your people
                  </h3>
                </div>
                <p className="text-muted-lavender font-body text-sm pl-9">
                  🤝 Every Tribe has its own culture, its own language, its own energy.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Rocket className="w-6 h-6 text-electric-blue" />
                  <h3 className="font-headline text-lg text-pearl-white">
                    Lead the movement
                  </h3>
                </div>
                <p className="text-muted-lavender font-body text-sm pl-9">
                  🚀 Create a Tribe, set the tone, and watch it grow.
                </p>
              </div>
            </div>

            {/* Philosophy */}
            <div className="p-6 rounded-2xl bg-neon-lilac/5 border border-neon-lilac/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-headline text-pearl-white">
                  It's not just social.
                </h3>
                <p className="text-lg text-electric-blue/90 font-body leading-relaxed">
                  It's your digital world, built by you and the people who get it.
                </p>
              </div>
            </div>

            {/* Call to action */}
            <div className="text-center space-y-4">
              <p className="text-muted-lavender/70 font-body italic">
                "Your community is calling. Ready to answer?"
              </p>
              <Button
                onClick={onClose}
                className="px-8 py-3 bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white font-body font-medium rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 dreamy-glow border-0"
              >
                Join the Tribe
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
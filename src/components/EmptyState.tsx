import React from 'react';
import { Card, CardContent } from './ui/card';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="min-h-screen bg-midnight-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-midnight-black/50 border-muted-lavender/30">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="w-16 h-16 mb-4 bg-muted-lavender/10 border border-muted-lavender/20 rounded-2xl flex items-center justify-center">
            {icon || <AlertCircle className="w-8 h-8 text-muted-lavender/40" />}
          </div>
          <h3 className="font-headline text-pearl-white mb-2">{title}</h3>
          {description && (
            <p className="text-muted-lavender font-body text-sm">{description}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
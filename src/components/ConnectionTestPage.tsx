import React from 'react';
import { SupabaseConnectionTest } from './SupabaseConnectionTest';
import { DatabaseDiagnostic } from './DatabaseDiagnostic';
import { Button } from './ui/button';
import { ArrowLeft, Database } from 'lucide-react';

interface ConnectionTestPageProps {
  onBack: () => void;
}

export function ConnectionTestPage({ onBack }: ConnectionTestPageProps) {
  return (
    <div className="min-h-screen bg-midnight-black p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onBack}
            className="text-muted-lavender hover:text-pearl-white hover:bg-muted-lavender/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-headline text-pearl-white">Connection & Diagnostics</h1>
            <p className="text-muted-lavender font-body text-sm">Test connections and diagnose database issues</p>
          </div>
        </div>

        {/* Connection Test Component */}
        <SupabaseConnectionTest />

        {/* Database Diagnostic Component */}
        <DatabaseDiagnostic />

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-4 bg-muted-lavender/5 rounded-lg border border-muted-lavender/10">
            <h3 className="text-pearl-white font-headline text-sm mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-electric-blue" />
              What's Being Tested
            </h3>
            <ul className="space-y-1 text-xs text-muted-lavender font-body">
              <li>• Supabase client initialization</li>
              <li>• Authentication status</li>
              <li>• Server health endpoint</li>
              <li>• Notification system</li>
              <li>• Direct database access</li>
            </ul>
          </div>

          <div className="p-4 bg-muted-lavender/5 rounded-lg border border-muted-lavender/10">
            <h3 className="text-pearl-white font-headline text-sm mb-2">Expected Results</h3>
            <ul className="space-y-1 text-xs text-muted-lavender font-body">
              <li><span className="text-green-400">•</span> Supabase Client: Success (if authenticated)</li>
              <li><span className="text-green-400">•</span> Server Health: Success (if server running)</li>
              <li><span className="text-green-400">•</span> Authentication: Success (if logged in)</li>
              <li><span className="text-yellow-400">•</span> Notifications: Warning (using mock data)</li>
              <li><span className="text-green-400">•</span> Database: Success (if tables exist)</li>
            </ul>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="p-4 bg-glitch-red/5 rounded-lg border border-glitch-red/10">
          <h3 className="text-pearl-white font-headline text-sm mb-2">Troubleshooting</h3>
          <div className="text-xs text-muted-lavender font-body space-y-2">
            <p><strong className="text-pearl-white">If tests fail:</strong></p>
            <ul className="space-y-1 ml-4">
              <li>• Check your internet connection</li>
              <li>• Verify Supabase credentials are correct</li>
              <li>• Ensure you're logged in to the app</li>
              <li>• Check if database tables are created</li>
              <li>• Verify server endpoints are deployed</li>
            </ul>
            <p className="mt-3"><strong className="text-pearl-white">Note:</strong> Notifications may show "warning" status and use mock data - this is normal and demonstrates the notification UI functionality.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { updateBio, updateBioDirectFetch, updateBioSimple } from '../utils/supabase/user-helpers';
import { toast } from 'sonner@2.0.3';

interface QuickBioTestProps {
  userId?: string;
}

export function QuickBioTest({ userId }: QuickBioTestProps) {
  const [testBio, setTestBio] = useState('Quick test bio update from debug tool');
  const [isTestingNormal, setIsTestingNormal] = useState(false);
  const [isTestingDirect, setIsTestingDirect] = useState(false);
  const [isTestingSimple, setIsTestingSimple] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const testUserId = userId || 'test-user-id';

  const handleNormalTest = async () => {
    setIsTestingNormal(true);
    setLastResult(null);

    try {
      await updateBio(testUserId, testBio);
      setLastResult({ type: 'success', message: 'Normal bio update succeeded!' });
      toast.success('Normal bio update test passed!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({ type: 'error', message: `Normal test failed: ${message}` });
      toast.error('Normal bio update test failed');
    } finally {
      setIsTestingNormal(false);
    }
  };

  const handleDirectTest = async () => {
    setIsTestingDirect(true);
    setLastResult(null);

    try {
      await updateBioDirectFetch(testUserId, testBio);
      setLastResult({ type: 'success', message: 'Direct fetch bio update succeeded!' });
      toast.success('Direct bio update test passed!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({ type: 'error', message: `Direct test failed: ${message}` });
      toast.error('Direct bio update test failed');
    } finally {
      setIsTestingDirect(false);
    }
  };

  const handleSimpleTest = async () => {
    setIsTestingSimple(true);
    setLastResult(null);

    try {
      await updateBioSimple(testUserId, testBio);
      setLastResult({ type: 'success', message: 'Simple Supabase bio update succeeded!' });
      toast.success('Simple bio update test passed!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastResult({ type: 'error', message: `Simple test failed: ${message}` });
      toast.error('Simple bio update test failed');
    } finally {
      setIsTestingSimple(false);
    }
  };

  return (
    <Card className="bg-midnight-black/50 border-muted-lavender/30">
      <CardHeader>
        <CardTitle className="text-neon-lilac flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Quick Bio Update Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-lavender mb-2">
            Test Bio Content:
          </label>
          <textarea
            value={testBio}
            onChange={(e) => setTestBio(e.target.value)}
            className="w-full p-3 bg-midnight-black/50 border border-muted-lavender/30 rounded-lg text-pearl-white placeholder:text-muted-lavender/60 resize-none"
            rows={2}
            maxLength={280}
          />
          <div className="text-xs text-muted-lavender/70 mt-1">
            {testBio.length}/280 characters
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleNormalTest}
            disabled={isTestingNormal || isTestingDirect || isTestingSimple}
            className="bg-electric-blue hover:bg-electric-blue/90 text-midnight-black text-xs"
          >
            {isTestingNormal ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              'Normal'
            )}
          </Button>

          <Button
            onClick={handleDirectTest}
            disabled={isTestingNormal || isTestingDirect || isTestingSimple}
            className="bg-soft-blush hover:bg-soft-blush/90 text-midnight-black text-xs"
          >
            {isTestingDirect ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              'Direct'
            )}
          </Button>

          <Button
            onClick={handleSimpleTest}
            disabled={isTestingNormal || isTestingDirect || isTestingSimple}
            className="bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black text-xs"
          >
            {isTestingSimple ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              'Simple'
            )}
          </Button>
        </div>

        {lastResult && (
          <div className={`p-3 rounded-lg border ${
            lastResult.type === 'success' 
              ? 'bg-electric-blue/20 border-electric-blue/30' 
              : 'bg-glitch-red/20 border-glitch-red/30'
          }`}>
            <div className="flex items-center gap-2">
              {lastResult.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-electric-blue" />
              ) : (
                <AlertCircle className="w-4 h-4 text-glitch-red" />
              )}
              <Badge variant={lastResult.type === 'success' ? 'default' : 'destructive'}>
                {lastResult.type}
              </Badge>
            </div>
            <p className="text-sm text-pearl-white mt-1">
              {lastResult.message}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-lavender/60">
          <p><strong>Normal:</strong> makeAuthenticatedRequest (current method)</p>
          <p><strong>Direct:</strong> Direct fetch bypassing helpers</p>
          <p><strong>Simple:</strong> Direct Supabase client (fastest)</p>
        </div>
      </CardContent>
    </Card>
  );
}
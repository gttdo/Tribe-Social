import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { SimpleAvatarUpload } from './SimpleAvatarUpload';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Camera, TestTube2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AvatarUploadTest() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testAvatarUrl, setTestAvatarUrl] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Mock user ID for testing
  const mockUserId = 'test-user-' + Date.now();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setTestAvatarUrl(newAvatarUrl);
    addTestResult(`✅ Avatar updated successfully: ${newAvatarUrl.substring(0, 50)}...`);
    toast.success('Avatar test completed successfully!');
  };

  const runBasicTest = () => {
    addTestResult('🧪 Starting basic avatar upload test...');
    setIsDialogOpen(true);
  };

  const clearTest = () => {
    setTestAvatarUrl(null);
    setTestResults([]);
    addTestResult('🔄 Test cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-black via-midnight-black to-purple-900/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-gradient-to-br from-midnight-black/80 to-midnight-black/60 border-muted-lavender/30">
          <CardHeader>
            <CardTitle className="text-pearl-white font-headline flex items-center gap-2">
              <TestTube2 className="w-6 h-6 text-neon-lilac" />
              Avatar Upload System Test
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current Avatar Display */}
            <div className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <p className="text-muted-lavender text-sm mb-3">Test Avatar Preview</p>
                <Avatar className="w-24 h-24">
                  <AvatarImage src={testAvatarUrl || ''} />
                  <AvatarFallback className="bg-gradient-to-r from-neon-lilac to-electric-blue text-midnight-black text-xl">
                    TU
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {testAvatarUrl && (
                <div className="text-center">
                  <p className="text-xs text-muted-lavender break-all max-w-md">
                    {testAvatarUrl}
                  </p>
                </div>
              )}
            </div>

            {/* Test Controls */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={runBasicTest}
                className="bg-neon-lilac hover:bg-neon-lilac/80 text-midnight-black"
              >
                <Camera className="w-4 h-4 mr-2" />
                Test Avatar Upload
              </Button>
              
              <Button
                onClick={clearTest}
                variant="outline"
                className="border-muted-lavender/30 text-pearl-white hover:bg-muted-lavender/10"
              >
                Clear Test
              </Button>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
                <h3 className="text-pearl-white font-medium mb-3 flex items-center gap-2">
                  <TestTube2 className="w-4 h-4" />
                  Test Results
                </h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div 
                      key={index}
                      className="text-xs text-muted-lavender bg-midnight-black/30 p-2 rounded border-l-2 border-electric-blue/30"
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Information */}
            <div className="bg-muted-lavender/5 border border-muted-lavender/20 rounded-lg p-4">
              <h3 className="text-pearl-white font-medium mb-3">System Information</h3>
              <div className="space-y-2 text-xs text-muted-lavender">
                <div className="flex justify-between">
                  <span>Test User ID:</span>
                  <span className="font-mono">{mockUserId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Upload Component:</span>
                  <span>SimpleAvatarUpload</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Backend:</span>
                  <span>Supabase Storage</span>
                </div>
                <div className="flex justify-between">
                  <span>Bucket:</span>
                  <span>avatars</span>
                </div>
              </div>
            </div>

            {/* Test Instructions */}
            <div className="bg-electric-blue/5 border border-electric-blue/20 rounded-lg p-4">
              <h3 className="text-electric-blue font-medium mb-2">Test Instructions</h3>
              <ol className="text-xs text-muted-lavender space-y-1 list-decimal list-inside">
                <li>Click "Test Avatar Upload" to open the upload dialog</li>
                <li>Try uploading an image file (JPG, PNG, WebP)</li>
                <li>Or use the camera capture option</li>
                <li>Check the test results for any errors</li>
                <li>Verify the avatar preview updates correctly</li>
              </ol>
            </div>

            {/* Expected Behavior */}
            <div className="bg-neon-lilac/5 border border-neon-lilac/20 rounded-lg p-4">
              <h3 className="text-neon-lilac font-medium mb-2">Expected Behavior</h3>
              <ul className="text-xs text-muted-lavender space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Dialog opens without accessibility warnings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  File upload accepts valid image formats
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Storage bucket is created if missing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Avatar URL is generated and displayed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  No console errors during upload process
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Avatar Upload Dialog */}
        <SimpleAvatarUpload
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          userId={mockUserId}
          onAvatarUpdate={handleAvatarUpdate}
        />
      </div>
    </div>
  );
}
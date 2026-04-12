import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function PostNavigationTest() {
  const [logs, setLogs] = useState<string[]>([]);
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Simulate the flow
  const simulateCreatePostFlow = () => {
    addLog('🚀 Starting post creation flow simulation...');
    
    // Step 1: SocialFeed navigates to create page
    addLog('📱 SocialFeed: Setting currentPage to "create"');
    setShowCreateFlow(true);
    
    // Step 2: User creates a post (simulated)
    setTimeout(() => {
      addLog('✍️ User creates a post...');
      
      // Step 3: CreatePostPage calls onPostCreated
      setTimeout(() => {
        addLog('✅ CreatePostPage: Post created successfully, calling onPostCreated()');
        
        // Step 4: CreateContentPage handles the callback
        setTimeout(() => {
          addLog('🔄 CreateContentPage: Handling post creation callback');
          addLog('🔄 CreateContentPage: Calling onContentCreated (SocialFeed.handlePostCreated)');
          
          // Step 5: SocialFeed refreshes feed
          setTimeout(() => {
            addLog('🔄 SocialFeed: Refreshing feed after post creation');
            addLog('🔙 CreateContentPage: Calling onBack() to navigate to feed');
            
            // Step 6: Navigation back to feed
            setTimeout(() => {
              setShowCreateFlow(false);
              addLog('📱 SocialFeed: Back to feed page');
              addLog('✅ Flow completed successfully!');
            }, 100);
          }, 100);
        }, 100);
      }, 1000);
    }, 500);
  };

  if (showCreateFlow) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>📝 Create Post Page (Simulated)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-950/20 border border-blue-400/30 rounded-lg">
            <p className="text-blue-200">Creating post... This would be the CreatePostPage component.</p>
            <p className="text-sm text-blue-300 mt-2">The real component would call onPostCreated() when done.</p>
          </div>
          
          <Button 
            onClick={() => setShowCreateFlow(false)}
            variant="outline"
            className="w-full"
          >
            Cancel (Manual Navigation Test)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Post Navigation Flow Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button 
            onClick={simulateCreatePostFlow}
            className="w-full"
          >
            🧪 Simulate Post Creation Flow
          </Button>
          
          <Button 
            onClick={clearLogs}
            variant="outline"
            className="w-full"
          >
            Clear Logs
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Flow Logs:</h3>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">No logs yet. Run the test to see the flow.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Expected Flow:</strong></p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>SocialFeed renders CreateContentPage when currentPage = 'create'</li>
            <li>CreateContentPage renders CreatePostPage</li>
            <li>User creates post successfully</li>
            <li>CreatePostPage calls onPostCreated() callback</li>
            <li>CreateContentPage.handlePostCreated() runs:</li>
            <li className="ml-4">- Calls onContentCreated() (SocialFeed.handlePostCreated)</li>
            <li className="ml-4">- SocialFeed refreshes feed</li>
            <li className="ml-4">- Calls onBack() to navigate to feed</li>
            <li>SocialFeed sets currentPage = 'feed'</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
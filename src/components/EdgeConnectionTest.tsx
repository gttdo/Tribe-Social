import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function EdgeConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults = [];

    // Test 1: Edge module import
    try {
      console.log('Testing edge module import...');
      const edgeModule = await import('../utils/edge');
      testResults.push({
        test: 'Edge Module Import',
        status: 'success',
        message: `Available functions: ${Object.keys(edgeModule).join(', ')}`
      });
    } catch (error) {
      testResults.push({
        test: 'Edge Module Import',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 2: ServerApi import
    try {
      console.log('Testing serverApi import...');
      const We = (await import('../lib/serverApi')).default;
      testResults.push({
        test: 'ServerApi Import',
        status: 'success',
        message: `We function imported: ${typeof We}`
      });
    } catch (error) {
      testResults.push({
        test: 'ServerApi Import',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 3: Test session sync
    try {
      console.log('Testing session sync...');
      const { validateSessionWithSync } = await import('../utils/session-sync');
      const validation = await validateSessionWithSync();
      testResults.push({
        test: 'Session Sync',
        status: validation.isValid ? 'success' : 'error',
        message: validation.isValid 
          ? `Valid session with user: ${validation.userId?.substring(0, 8)}...`
          : `Invalid session: ${validation.error}`
      });
    } catch (error) {
      testResults.push({
        test: 'Session Sync',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 4: Test edge getFeed function
    try {
      console.log('Testing edge getFeed function...');
      const { getFeed } = await import('../utils/edge');
      await getFeed();
      testResults.push({
        test: 'Edge getFeed',
        status: 'success',
        message: 'getFeed function executed successfully'
      });
    } catch (error) {
      testResults.push({
        test: 'Edge getFeed',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // Test 5: Test serverApi We function
    try {
      console.log('Testing serverApi We function...');
      const We = (await import('../lib/serverApi')).default;
      await We();
      testResults.push({
        test: 'ServerApi We Function',
        status: 'success',
        message: 'We function executed successfully'
      });
    } catch (error) {
      testResults.push({
        test: 'ServerApi We Function',
        status: 'error',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setResults(testResults);
    setTesting(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Edge Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Connection Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Test Results:</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span className="font-medium">{result.test}</span>
                </div>
                <p className="text-sm">{result.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
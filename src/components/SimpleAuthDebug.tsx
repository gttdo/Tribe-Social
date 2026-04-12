import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';

/**
 * SIMPLE AUTH DEBUG - Single component for FigmaMake
 * Just add this to any component where you're getting 401 errors
 */
export function SimpleAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runDebug = async () => {
    setTesting(true);
    const info: any = { timestamp: new Date().toISOString() };

    try {
      // 1. Check session
      const { data: { session }, error } = await supabase.auth.getSession();
      info.sessionError = error?.message || null;
      info.hasSession = !!session;
      info.hasToken = !!session?.access_token;
      info.hasUser = !!session?.user;
      info.tokenLength = session?.access_token?.length || 0;
      info.userEmail = session?.user?.email || 'none';
      
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        info.expiresAt = expiresAt.toISOString();
        info.isExpired = now >= expiresAt;
        info.minutesUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 60000);
      }

      // 2. Test API endpoint
      if (session?.access_token) {
        // First test: Check if edge function test endpoint is reachable
        try {
          const basicResponse = await fetch('https://wrukreoxdexnfufyftvs.supabase.co/functions/v1/make-server-70df0d6e/test', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': (await import('../utils/supabase/info')).publicAnonKey
            }
          });
          
          info.basicTestStatus = basicResponse.status;
          info.basicTestOk = basicResponse.ok;
          info.basicTestError = basicResponse.ok ? null : await basicResponse.text();
        } catch (basicError: any) {
          info.basicTestError = basicError.message;
        }

        // Second test: Try the posts endpoint with auth (corrected path)
        try {
          const response = await fetch('https://wrukreoxdexnfufyftvs.supabase.co/functions/v1/make-server-70df0d6e/posts', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': (await import('../utils/supabase/info')).publicAnonKey
            }
          });
          
          info.apiTestStatus = response.status;
          info.apiTestOk = response.ok;
          info.apiTestError = response.ok ? null : await response.text();
        } catch (apiError: any) {
          info.apiTestError = apiError.message;
          
          // Try a direct Supabase table query as backup test
          try {
            const { supabase } = await import('../utils/supabase/client');
            const { data, error } = await supabase.from('posts').select('count', { count: 'exact', head: true });
            if (!error) {
              info.supabaseDirectTest = 'SUCCESS - Direct Supabase works';
              info.supabaseDirectCount = data || 0;
            } else {
              info.supabaseDirectTest = `FAILED - ${error.message}`;
            }
          } catch (supabaseError: any) {
            info.supabaseDirectTest = `ERROR - ${supabaseError.message}`;
          }
        }
      }

    } catch (err: any) {
      info.generalError = err.message;
    }

    setDebugInfo(info);
    setTesting(false);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      backgroundColor: 'white', 
      border: '2px solid #red', 
      borderRadius: '8px', 
      padding: '15px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '400px',
      zIndex: 9999,
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>🔍 JWT Debug</h3>
      
      <button 
        onClick={runDebug}
        disabled={testing}
        style={{
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          cursor: testing ? 'not-allowed' : 'pointer',
          marginBottom: '10px'
        }}
      >
        {testing ? 'Testing...' : 'Run Auth Test'}
      </button>

      {debugInfo && (
        <div style={{ fontSize: '11px', color: 'black' }}>
          <div><strong>Session:</strong> {debugInfo.hasSession ? '✅' : '❌'}</div>
          <div><strong>Token:</strong> {debugInfo.hasToken ? '✅' : '❌'} ({debugInfo.tokenLength} chars)</div>
          <div><strong>User:</strong> {debugInfo.hasUser ? '✅' : '❌'} ({debugInfo.userEmail})</div>
          
          {debugInfo.expiresAt && (
            <div>
              <strong>Expires:</strong> {debugInfo.isExpired ? '❌ EXPIRED' : '✅ Valid'} 
              ({debugInfo.minutesUntilExpiry} mins)
            </div>
          )}
          
          {debugInfo.basicTestStatus && (
            <div>
              <strong>Basic Edge Test:</strong> {debugInfo.basicTestOk ? '✅' : '❌'} ({debugInfo.basicTestStatus})
            </div>
          )}
          
          {debugInfo.apiTestStatus && (
            <div>
              <strong>Auth API Test:</strong> {debugInfo.apiTestOk ? '✅' : '❌'} ({debugInfo.apiTestStatus})
            </div>
          )}

          {debugInfo.sessionError && (
            <div style={{ color: 'red' }}><strong>Session Error:</strong> {debugInfo.sessionError}</div>
          )}
          
          {debugInfo.apiTestError && (
            <div style={{ color: 'red' }}><strong>API Error:</strong> {debugInfo.apiTestError}</div>
          )}
          
          {debugInfo.supabaseDirectTest && (
            <div style={{ color: debugInfo.supabaseDirectTest.includes('SUCCESS') ? 'green' : 'red' }}>
              <strong>Direct Supabase:</strong> {debugInfo.supabaseDirectTest}
            </div>
          )}
          
          {debugInfo.generalError && (
            <div style={{ color: 'red' }}><strong>General Error:</strong> {debugInfo.generalError}</div>
          )}

          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer' }}>Raw Data</summary>
            <pre style={{ fontSize: '9px', marginTop: '4px', overflow: 'auto', maxHeight: '100px' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

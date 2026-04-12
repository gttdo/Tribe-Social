import React from 'react';

interface DebugClickTestProps {
  onClose: () => void;
}

export function DebugClickTest({ onClose }: DebugClickTestProps) {
  console.log('🚨 DebugClickTest is rendering');
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
        🚨 CLICK TEST DEBUG MODE
      </div>
      
      <button
        onClick={() => {
          console.log('🟢 BASIC BUTTON CLICKED!');
          alert('🟢 Basic button works!');
        }}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          backgroundColor: 'green',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        🟢 Click Test Button
      </button>
      
      <div 
        onClick={() => {
          console.log('🔵 DIV CLICKED!');
          alert('🔵 Div click works!');
        }}
        style={{
          padding: '20px 40px',
          fontSize: '18px',
          backgroundColor: 'blue',
          color: 'white',
          borderRadius: '8px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      >
        🔵 Click Test Div
      </div>
      
      <div style={{ color: 'white', fontSize: '14px', textAlign: 'center' }}>
        If you can see this red overlay and click the buttons above,<br/>
        then basic clicking works. Check console for click logs.
      </div>
      
      <button
        onClick={() => {
          console.log('🔴 CLOSING DEBUG TEST - calling onClose()');
          onClose();
        }}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          backgroundColor: 'red',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
      >
        ❌ Close Debug Test
      </button>
    </div>
  );
}
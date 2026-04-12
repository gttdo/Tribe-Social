import React from 'react';

interface UltraSimpleTestProps {
  onClose: () => void;
}

export function UltraSimpleTest({ onClose }: UltraSimpleTestProps) {
  console.log('🟡 UltraSimpleTest component is rendering');

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 255, 0, 0.9)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
        fontSize: '24px',
        color: 'black',
        fontWeight: 'bold'
      }}
      onClick={() => {
        console.log('🟡 Background clicked');
        alert('Background clicked');
      }}
    >
      <div>🟡 ULTRA SIMPLE TEST - If you see this, modal rendering works</div>
      
      <button
        style={{
          padding: '20px 40px',
          fontSize: '20px',
          backgroundColor: 'blue',
          color: 'white',
          border: '3px solid white',
          borderRadius: '10px',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('🟢 Button clicked successfully!');
          alert('🟢 Button works!');
        }}
        onMouseDown={() => console.log('🟢 Button mousedown')}
        onMouseUp={() => console.log('🟢 Button mouseup')}
      >
        TEST BUTTON
      </button>

      <div
        style={{
          padding: '20px 40px',
          fontSize: '20px',
          backgroundColor: 'red',
          color: 'white',
          border: '3px solid white',
          borderRadius: '10px',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('🔴 Div clicked successfully!');
          alert('🔴 Div works!');
        }}
      >
        TEST DIV
      </div>

      <button
        style={{
          padding: '15px 30px',
          fontSize: '16px',
          backgroundColor: 'red',
          color: 'white',
          border: '2px solid white',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('🔴 CLOSING DEBUG TEST - calling onClose()');
          onClose();
        }}
      >
        ❌ CLOSE TEST
      </button>

      <div style={{ textAlign: 'center', fontSize: '16px' }}>
        Click anywhere on the green background to test background clicks<br/>
        Click the blue button or red div to test interactive elements<br/>
        Click the red CLOSE TEST button to close this modal
      </div>
    </div>
  );
}
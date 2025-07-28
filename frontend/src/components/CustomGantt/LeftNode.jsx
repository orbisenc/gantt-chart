import React from 'react';
import { Handle } from '@xyflow/react';

/**
 * LeftNode component for ReactFlow - handles left side connections
 */
const LeftNode = ({ data, isConnectable }) => {
  const isConnectionMode = data.isConnectionMode || false;
  const isConnecting = data.isConnecting || false;
  const connectingFromSide = data.connectingFromSide;
  
  // console.log("LeftNode render:", { 
  //   taskId: data.task?.id, 
  //   isConnectionMode, 
  //   isConnecting, 
  //   connectingFromSide 
  // });
  
  const getHandleStyle = (isVisible = true, isTarget = false) => {
    let shouldShow = isConnectionMode && isVisible;
    let zIndex = 20;
    
    // For target handles, only show when actively connecting and give higher zIndex
    if (isTarget) {
      shouldShow = isConnectionMode && isConnecting;
      zIndex = isConnecting ? 30 : 10; // Higher zIndex when connecting
    } else {
      // For source handles, lower zIndex when someone is connecting
      zIndex = isConnecting ? 10 : 20;
    }
    
    return {
      opacity: shouldShow ? 1 : 0,
      visibility: shouldShow ? 'visible' : 'hidden',
      transition: 'opacity 0.2s ease, visibility 0.2s ease',
      backgroundColor: isTarget ? '#888888' : '#ff4444', // Gray for targets, Red for left sources
      border: `2px solid #ffffff`,
      borderRadius: '50%',
      width: '8px',
      height: '8px',
      zIndex: zIndex,
      cursor: 'pointer',
      position: 'absolute',
      pointerEvents: shouldShow ? 'all' : 'none'
    };
  };

  return (
    <div style={{
      width: data.width,
      height: data.height,
      background: 'transparent',
      position: 'relative',
    }}>
      {/* Left Source Handle - Visible (for starting connections) */}
      <Handle 
        id="left-source"
        type="source" 
        position="left" 
        style={{
          top: data.height/2 - 6, // Slightly higher
          left: -4,
          ...getHandleStyle(true, false) // Visible, not target
        }}
      />

      {/* Left Target Handle - Shows only when connecting (for receiving connections) */}
      <Handle 
        id="left-target"
        type="target" 
        position="left" 
        style={{
          top: data.height/2 + 2, // Slightly lower  
          left: -4,
          ...getHandleStyle(true, true) // Visible when connecting, is target
        }}
      />
    </div>
  );
};

export default LeftNode;
import React from 'react';
import { Handle } from '@xyflow/react';
import { TaskSubType } from './types';

/**
 * ConnectionNode component for ReactFlow
 * This is used as a custom node type in ReactFlow for task connections
 */
const ConnectionNode = ({ data, isConnectable }) => {
  // Get the isConnectionMode from the data passed by ReactFlow
  const isConnectionMode = data.isConnectionMode || false;
  
  const getHandleStyle = (isConnectionMode, color = '#1f6bd9') => {  
    return {
      opacity: isConnectionMode ? 1 : 0,
      visibility: isConnectionMode ? 'visible' : 'hidden',
      transition: 'opacity 0.2s ease, visibility 0.2s ease',
      backgroundColor: color,
      border: `2px solid #ffffff`,
      borderRadius: '50%',
      width: '8px',
      height: '8px',
      zIndex: 20,
      cursor: 'pointer',
      position: 'absolute'
    };
  };


  return (
    <div style={{
      width: data.width,
      height: data.height,
      background: isConnectionMode ? 'rgba(31, 107, 217, 0.1)' : 'transparent',
      border: isConnectionMode ? '1px dashed #1f6bd9' : 'none',
      borderRadius: '3px',
      position: 'relative',
      left: -1,
      top: -1,
    }}>
      {data.task?.subType === TaskSubType.MILESTONE ? (
        /* Center Handle for milestones only */
        <>
          <Handle 
            id="left-source"
            type="source" 
            position="left" 
            style={{
              top: data.height/2,
              left: data.cellWidth - Math.sqrt(8*8*2) - 1, // Match milestone diamond position + center adjustment
              ...getHandleStyle(isConnectionMode)
            }}
          />
          
          <Handle 
            id="right-source"
            type="source" 
            position="right" 
            style={{
              top: data.height/2,
              left: data.cellWidth, // Match milestone diamond position + center adjustment
              ...getHandleStyle(isConnectionMode)
            }}
          />
        </>
      ) : (
        /* Left and Right Handles for regular tasks */
        <>
          <Handle 
            id="left-source"
            type="source" 
            position="left" 
            style={{
              top: data.height/2,
              //left: -4,
              ...getHandleStyle(isConnectionMode)
            }}
          />

          <Handle 
            id="right-source"
            type="source" 
            position="right" 
            style={{
              top: data.height/2,
              //right: -4,
              ...getHandleStyle(isConnectionMode)
            }}
          />
        </>
      )}
    </div>
  );
};

export default ConnectionNode;
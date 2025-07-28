import React from 'react';

/**
 * Custom connection line component for React Flow
 * This is rendered when the user is dragging from a handle to create a connection
 */
const CustomConnectionLine = ({ 
  fromX, 
  fromY, 
  toX, 
  toY,
  fromPosition,
  toPosition,
  fromHandle
}) => {
  //console.log("CustomConnectionLine rendered:", { fromX, fromY, toX, toY, fromHandle });
  
  // Determine color based on source handle
  const getLineColor = (handleId) => {
    if (handleId?.includes('left')) {
      return '#ff4444'; // Red for left handles
    } else if (handleId?.includes('right')) {
      return '#1f6bd9'; // Blue for right handles
    }
    return '#1f6bd9'; // Default blue
  };
  
  const lineColor = getLineColor(fromHandle?.id);
  
  // Log computed styles of connection line elements
  // React.useEffect(() => {
  //   const connectionLineElement = document.querySelector('.react-flow__connectionline');
  //   const connectionLineSvg = document.querySelector('.react-flow__connectionline svg');
    
  //   if (connectionLineElement) {
  //     const styles = window.getComputedStyle(connectionLineElement);
  //     console.log("🎨 .react-flow__connectionline styles:", {
  //       zIndex: styles.zIndex,
  //       position: styles.position,
  //       display: styles.display,
  //       visibility: styles.visibility,
  //       opacity: styles.opacity,
  //       pointerEvents: styles.pointerEvents,
  //       transform: styles.transform
  //     });
  //   }
    
  //   if (connectionLineSvg) {
  //     const svgStyles = window.getComputedStyle(connectionLineSvg);
  //     console.log("🎨 .react-flow__connectionline svg styles:", {
  //       zIndex: svgStyles.zIndex,
  //       position: svgStyles.position,
  //       display: svgStyles.display,
  //       visibility: svgStyles.visibility,
  //       opacity: svgStyles.opacity,
  //       pointerEvents: svgStyles.pointerEvents
  //     });
  //   }
  // }, []);
  
  // Create a smooth bezier curve path
  const deltaX = toX - fromX;
  const controlOffset = Math.max(50, Math.abs(deltaX) * 0.3);
  
  let sourceControlX = fromX;
  let targetControlX = toX;
  
  // Adjust control points based on handle positions
  if (fromPosition === 'right') {
    sourceControlX = fromX + controlOffset;
  } else if (fromPosition === 'left') {
    sourceControlX = fromX - controlOffset;
  }
  
  if (toPosition === 'left') {
    targetControlX = toX - controlOffset;
  } else if (toPosition === 'right') {
    targetControlX = toX + controlOffset;
  }
  
  const path = `M ${fromX} ${fromY} C ${sourceControlX} ${fromY} ${targetControlX} ${toY} ${toX} ${toY}`;

  return (
    <g style={{ zIndex: 1000 }}>
      {/* <defs>
        <marker
          id="connection-arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="#1f6bd9"
          />
        </marker>
      </defs> */}
      
      <path
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeDasharray="5,5"
        d={path}
        markerEnd="url(#connection-arrowhead)"
        style={{
          animation: 'dash 1s linear infinite'
        }}
      />
      
      {/* <circle
        cx={fromX}
        cy={fromY}
        r="4"
        fill={lineColor}
        opacity="0.8"
      /> */}
      
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={4}
        stroke={lineColor}
        strokeWidth={2}
      />
    </g>
  );
};

export default CustomConnectionLine;
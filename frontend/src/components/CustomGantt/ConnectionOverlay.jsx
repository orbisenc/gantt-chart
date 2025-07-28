import React, { useMemo, useCallback, useState } from 'react';
import ConnectionNode from './ConnectionNode';
import CustomConnectionLine from './CustomConnectionLine';
import { calculateTaskPosition } from './utils';
import { 
  ReactFlow, 
  ReactFlowProvider, 
  useNodesState, 
  useEdgesState,
  addEdge,
  ConnectionMode,
  Background,
  Controls, 
  BackgroundVariant 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CustomGantt.css';

const ConnectionOverlay = ({ 
  tasks, 
  timelineScale, 
  projectStart, 
  cellWidth, 
  rowHeight,
  connections = [],
  onConnectionCreate,
  onConnectionDelete,
  scrollLeft = 0,
  scrollTop = 0,
  isConnectionMode = false
}) => {


  // Convert Gantt tasks to ReactFlow nodes
  const nodes = useMemo(() => {
    if (!tasks || !timelineScale || !projectStart) return [];

    return tasks.map((task, index) => {
      // Use the same position calculation as GanttTask for consistency
      const position = calculateTaskPosition(
        task,
        timelineScale,
        cellWidth,
        2, // cellGap
        timelineScale[0]?.unit || 'month'
      );

      // Apply the same positioning adjustments as GanttTask
      const nodePosition = {
        x: position.x + 2, // 좌측 2px 패딩 (same as GanttTask)
        y: index * rowHeight + 3, // 상단 3px 패딩 (same as GanttTask)
        width: position.width - 4, // 좌우 2px씩 패딩 (same as GanttTask)
        height: rowHeight - 6 // 상하 3px씩 패딩 (same as GanttTask)
      };
      
      return {
        id: `task-${task.id}`,
        type: 'connectionNode',
        position: { 
          x: nodePosition.x, 
          y: nodePosition.y 
        },
        data: { 
          task,
          width: nodePosition.width,
          height: nodePosition.height,
          isConnectionMode,
          cellWidth
        },
        style: {
          width: nodePosition.width,
          height: nodePosition.height,
          background: 'transparent',
          border: 'none',
          pointerEvents: isConnectionMode ? 'all' : 'none',
        },
        sourcePosition: 'right',
        targetPosition: 'left',
      };
    });
  }, [tasks, timelineScale, cellWidth, rowHeight, isConnectionMode]);

  // Convert connections to ReactFlow edges
  const edges = useMemo(() => {
    return connections.map(connection => ({
      id: `edge-${connection.from}-${connection.sourceHandle}-${connection.to}-${connection.targetHandle}`,
      source: `task-${connection.from}`,
      target: `task-${connection.to}`,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
      style: {
        stroke: connection.color || '#1f6bd9',
        strokeWidth: 2,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: connection.color || '#1f6bd9',
      },
      data: connection
    }));
  }, [connections]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes when props change
  React.useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);


  // Update edges when connections change
  React.useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);


  const onConnect = useCallback((params) => {
    const sourceTaskId = parseInt(params.source.replace('task-', ''));
    const targetTaskId = parseInt(params.target.replace('task-', ''));

    console.log("onConnect: ", params.sourceHandle, params.targetHandle);


    onConnectionCreate?.({
      from: sourceTaskId,
      to: targetTaskId,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'finish-to-start'
    });
  }, [onConnectionCreate]);

  // Custom connection line component
  const connectionLineComponent = useCallback((props) => {
    console.log("Connection line props:", props);
    return <CustomConnectionLine {...props} />;
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    if (event.ctrlKey || event.metaKey) {
      onConnectionDelete?.(edge.data);
    }
  }, [onConnectionDelete]);


  const nodeTypes = {
    connectionNode: ConnectionNode
  };

  //console.log("Nodes: ", nodes);
  //console.log("Edges: ", edges);

  // Monitor connection line DOM changes
  // React.useEffect(() => {
  //   const observer = new MutationObserver((mutations) => {
  //     mutations.forEach((mutation) => {
  //       mutation.addedNodes.forEach((node) => {
  //         if (node.nodeType === 1 && node.classList?.contains('react-flow__connectionline')) {
  //           console.log("🔗 Connection line SVG element ADDED");
  //           const styles = window.getComputedStyle(node);
  //           const rect = node.getBoundingClientRect();
  //           console.log("🎨 SVG positioning:", {
  //             position: styles.position,
  //             zIndex: styles.zIndex,
  //             transform: styles.transform,
  //             visibility: styles.visibility,
  //             opacity: styles.opacity,
  //             display: styles.display,
  //             rect: {
  //               top: rect.top,
  //               left: rect.left,
  //               width: rect.width,
  //               height: rect.height,
  //               visible: rect.width > 0 && rect.height > 0
  //             }
  //           });
            
  //           // Make the SVG temporarily visible for debugging
  //           node.style.border = '2px solid red';
  //           node.style.background = 'rgba(255,0,0,0.1)';
  //           setTimeout(() => {
  //             node.style.border = '';
  //             node.style.background = '';
  //           }, 2000);
  //         }
  //       });
        
  //       mutation.removedNodes.forEach((node) => {
  //         if (node.classList?.contains('react-flow__connection')) {
  //           console.log("🔗 Connection line DOM element REMOVED");
  //           console.log(node);
  //         }
  //       });
  //     });
  //   });

  //   observer.observe(document.body, {
  //     childList: true,
  //     subtree: true
  //   });

  //   return () => observer.disconnect();
  // }, []);
  
  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%',
      pointerEvents: isConnectionMode ? 'auto' : 'none',
      zIndex: 100
    }}>
      {isConnectionMode && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '11px',
          zIndex: 200,
          pointerEvents: 'all',
          border: '1px solid #ddd'
        }}>
          <div>• 작업을 드래그하여 연결</div>
          <div>• Ctrl+클릭으로 연결 삭제</div>
        </div>
      )}

      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionLineComponent={connectionLineComponent}
        viewport={{ x: -scrollLeft, y: -scrollTop, zoom: 1 }}
        onViewportChange={() => {}} 
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnDrag={false}
        panOnScroll={false}
        panOnScrollMode="free"
        preventScrolling={true}
        nodesDraggable={false}
        nodesConnectable={true}
        elementsSelectable={isConnectionMode}
        selectNodesOnDrag={false}
        fitView={false}
        style={{ 
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      >
        {/*{isConnectionMode && <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#e0e0e0" />}*/}
      </ReactFlow>
    </div>
  );
};

const ConnectionOverlayProvider = (props) => (
  <ReactFlowProvider>
    <ConnectionOverlay {...props} />
  </ReactFlowProvider>
);

export default ConnectionOverlayProvider;
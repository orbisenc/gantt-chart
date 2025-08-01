import React, { forwardRef, useEffect, useRef, useState } from 'react';
import GanttTask from './GanttTask';
import { calculateTaskPosition } from '../../utils/utils';
import useDragAndDrop from '../../utils/hooks/useDragAndDrop';
import ConnectionOverlay from './ConnectionOverlay';
import { ZoomLevel } from '../../utils/types';

const GanttChart = forwardRef(({ 
  tasks = [], 
  timelineScale = [],
  projectStart,
  cellWidth = 100,
  rowHeight = 32,
  selectedTask = null,
  markers = [],
  onTaskSelect,
  onTaskUpdate,
  onTaskDoubleClick,
  onTaskRightClick,
  onProgressChange,
  onScroll,
  connections = [],
  onConnectionCreate,
  onConnectionDelete,
  isConnectionMode = false,
  zoomLevel,
  tableRowCount = null // 테이블 행 개수 (높이 계산용)
}, ref) => {
  const containerRef = useRef(null);

  // 드래그 앤 드롭 훅 사용
  const {
    isDragging,
    isResizing,
    isInteracting,
    handleDragStart,
    handleResizeStart,
    handleMouseMove,
    handleMouseUp
  } = useDragAndDrop({
    tasks,
    onTaskUpdate,
    timelineScale,
    cellWidth: cellWidth, // 전달받은 동적 너비 사용
    cellGap: 2, // 고정 간격 사용
    timeUnit: timelineScale[0]?.unit || 'month'
  });

  useEffect(() => {
    if (ref) {
      ref.current = containerRef.current;
    }
  }, [ref]);

  const cellGap = 2; // 셀 간격 추가

  // 전역 마우스 이벤트 처리
  useEffect(() => {
    if (isInteracting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isInteracting, handleMouseMove, handleMouseUp]);

  const handleScroll = (e) => {
    const newScrollLeft = e.target.scrollLeft;
    const newScrollTop = e.target.scrollTop;
    onScroll?.(newScrollLeft, newScrollTop);
  };

  const handleTaskMouseDown = (e, task) => {
    //handleDragStart(e, task);
    onTaskSelect?.(task);
  };

  const handleTaskDoubleClick = (task) => {
    onTaskDoubleClick?.(task);
  };

  const handleTaskRightClick = (e, task) => {
    e.preventDefault();
    onTaskRightClick?.(e, task);
  };

  const handleTaskResizeStart = (e, task, handle) => {
    handleResizeStart(e, task, handle);
  };

  const handleTaskProgressChange = (taskId, newProgress) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, progress: newProgress };
      onTaskUpdate?.(updatedTask);
    }
    onProgressChange?.(taskId, newProgress);
  };

  const totalWidth = timelineScale.length * (cellWidth + cellGap) - cellGap; // 마지막 간격 제거
  const totalHeight = (tableRowCount !== null ? tableRowCount : tasks.length) * rowHeight;

  const nodeTypes = {
    customNode: GanttTask,
  }

  //const nodes = convertTasksToNodes(tasks);
  
  return (
    <div
      ref={containerRef}
      className="gantt-chart"
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : isResizing ? 'ew-resize' : 'default',
        overflow: 'visible' // 자체 스크롤 비활성화
      }}
      onScroll={handleScroll}
    >
      <div
        className="gantt-chart-content"
        style={{
          width: totalWidth,
          minWidth: totalWidth, // 중요: 최소 너비 설정
          height: totalHeight,
          minHeight: totalHeight, // 중요: 최소 높이 설정
          position: 'relative',
          backgroundColor: '#ffffff'
        }}
      >
        {/* 배경 그리드 */}
        <div 
          className="gantt-grid-background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          {/* 수직 그리드 라인 */}
          <div className="gantt-grid-line-vertical-container">
            {timelineScale.map((_, index) => (
              <div
                key={`vline-${index}`}
                className="gantt-grid-line-vertical"
                style={{
                  position: 'absolute',
                  left: index * (cellWidth + cellGap)-2,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#e6e6e6',
                  zIndex: 1
                }}
              />
            ))}
          </div>

          <div className="gantt-grid-line-horizontal-container">
            {/* 수평 그리드 라인 */}
            {Array.from({ length: tableRowCount !== null ? tableRowCount : tasks.length }).map((_, index) => (
              <div
                key={`hline-${index}`}
                className="gantt-grid-line-horizontal"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: index * rowHeight,
                  height: '1px',
                  backgroundColor: '#e6e6e6',
                  zIndex: 0
                }}
              />
            ))}
            
            {/* 하단 그리드 라인 */}
            <div
              key="hline-bottom"
              className="gantt-grid-line-horizontal"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: totalHeight,
                height: '1px',
                backgroundColor: '#e6e6e6',
                zIndex: 1
              }}
            />
          </div>
        </div>

        {/* 주말 배경 */}
        {timelineScale.map((scaleItem, index) => (
          scaleItem.isWeekend && (
            <div
              key={`weekend-${index}`}
              className="gantt-weekend-background"
              style={{
                position: 'absolute',
                left: index * (cellWidth + cellGap),
                top: 0,
                width: cellWidth,
                height: '100%',
                backgroundColor: '#f0f6fa',
                opacity: 0.7,
                zIndex: 2,
                pointerEvents: 'none'
              }}
            />
          )
        ))}

        {/* 마커 - 차트 영역에만 점선으로 표시 */}
        {markers.map((marker, index) => {
          const markerPosition = getMarkerPosition(marker.date, timelineScale, cellWidth + cellGap);
          if (markerPosition === null) return null;
          
          return (
            <div
              key={`chart-marker-${index}`}
              className={`gantt-timeline-marker ${marker.className || ''}`}
              style={{
                position: 'absolute',
                left: markerPosition,
                top: 0,
                height: '100%',
                width: '2px',
                borderLeft: '2px solid #ff4444',
                pointerEvents: 'none',
                zIndex: 25
              }}
            >
              {marker.text && (
                <div className="gantt-timeline-marker-label">
                  {marker.text}
                </div>
              )}
            </div>
          );
        })}

        {/* 태스크 바 */}
        <div id="gantt-task-container">
          {tasks.map((task, index) => {
            const position = calculateTaskPosition(
              task,
              timelineScale,
              cellWidth,
              cellGap,
              zoomLevel
            );
            
            // chartRowIndex가 있으면 사용, 없으면 원래 index 사용
            const rowIndex = task.chartRowIndex !== undefined ? task.chartRowIndex : index;
            
            // 일반태스크는 Phase 내부에 적당한 크기로 표시
            const isGeneralTask = task.type === 'task' && task.subType !== 'milestone';
            const taskPosition = {
              x: position.x + (isGeneralTask ? 4 : 2), // 일반태스크는 약간 안쪽에
              y: rowIndex * rowHeight + (isGeneralTask ? 5 : 3), // 일반태스크는 약간 아래쪽에
              width: position.width - (isGeneralTask ? 8 : 6), // 일반태스크는 약간 좁게
              height: rowHeight - (isGeneralTask ? 10 : 8) // 일반태스크는 적당한 크기로
            };
            
            return (
              <GanttTask
                key={task.id}
                task={task}
                position={taskPosition}
                isSelected={selectedTask?.id === task.id}
                onMouseDown={(e) => handleTaskMouseDown(e, task)}
                onDoubleClick={handleTaskDoubleClick}
                onRightClick={handleTaskRightClick}
                onResizeStart={handleTaskResizeStart}
                onProgressChange={handleTaskProgressChange}
                cellWidth={cellWidth}
              />
            );
          })}
        </div>

        {/* 드래그 중 시각적 피드백
        {isDragging && (
          <div
            className="drag-feedback"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              zIndex: 20,
              pointerEvents: 'none'
            }}
          />
        )} */}

        {/* Connection Overlay for Arrow Connections */}
        <ConnectionOverlay
          tasks={tasks}
          timelineScale={timelineScale}
          projectStart={projectStart}
          cellWidth={cellWidth}
          rowHeight={rowHeight}
          connections={connections}
          onConnectionCreate={onConnectionCreate}
          onConnectionDelete={onConnectionDelete}
          isConnectionMode={isConnectionMode}
        />

      </div>
    </div>
  );
});

/**
 * 마커의 위치를 계산합니다.
 * @param {Date} markerDate - 마커 날짜
 * @param {Array} timelineScale - 타임라인 스케일
 * @param {number} cellWidth - 셀 너비
 * @returns {number|null} 마커 위치 (픽셀)
 */
const getMarkerPosition = (markerDate, timelineScale, cellWidth) => {
  if (!markerDate || timelineScale.length === 0) return null;
  
  const markerTime = markerDate.getTime();
  
  // 첫 번째와 마지막 날짜 찾기
  const firstDate = timelineScale[0].date;
  const lastDate = timelineScale[timelineScale.length - 1].date;
  
  if (markerTime < firstDate.getTime() || markerTime > lastDate.getTime()) {
    return null;
  }
  
  // 마커가 위치할 셀 찾기
  for (let i = 0; i < timelineScale.length; i++) {
    const currentDate = timelineScale[i].date;
    const nextDate = i < timelineScale.length - 1 ? timelineScale[i + 1].date : null;
    
    if (nextDate && markerTime >= currentDate.getTime() && markerTime < nextDate.getTime()) {
      // 셀 내에서의 정확한 위치 계산
      const cellProgress = (markerTime - currentDate.getTime()) / (nextDate.getTime() - currentDate.getTime());
      return i * cellWidth + cellProgress * cellWidth;
    }
  }
  
  // 마지막 셀에 위치하는 경우
  return (timelineScale.length - 1) * cellWidth;
};

GanttChart.displayName = 'GanttChart';

export default GanttChart; 
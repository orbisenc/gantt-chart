import { useState, useCallback, useRef } from 'react';
import { getDaysBetween, addDays, calculateTaskPosition } from '../utils';

export const useDragAndDrop = ({
  tasks,
  onTaskUpdate,
  timelineScale,
  cellWidth,
  cellGap = 2,
  timeUnit = 'month'
}) => {
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const dragRef = useRef(null);

  // 픽셀을 날짜로 변환하는 함수 - 더 정밀한 계산
  const pixelsToDays = useCallback((pixels) => {
    // 타임라인 스케일에서 실제 단위 계산
    if (timelineScale && timelineScale.length > 1) {
      const firstDate = new Date(timelineScale[0].date);
      const secondDate = new Date(timelineScale[1].date);
      const daysBetweenCells = Math.abs(secondDate - firstDate) / (1000 * 60 * 60 * 24);
      const pixelsPerDay = cellWidth / daysBetweenCells;
      // 더 부드러운 스냅 - 반올림 대신 바닥 사용
      return Math.floor(pixels / pixelsPerDay);
    }
    // 폴백: 기존 방식 사용
    const daysPerPixel = getDaysPerPixel(timeUnit);
    return Math.floor(pixels / (cellWidth / daysPerPixel));
  }, [cellWidth, timeUnit, timelineScale]);

  // 시간 단위별 일수 계산
  const getDaysPerPixel = (unit) => {
    switch (unit) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  };

  // 드래그 시작 (태스크 이동)
  const handleDragStart = useCallback((e, task) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setDragState({
      task,
      startX,
      startY,
      initialX: e.clientX,
      initialY: e.clientY,
      type: 'move'
    });

    // 드래그 중 커서 스타일 변경
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  // 크기 조정 시작
  const handleResizeStart = useCallback((e, task, handle) => {
    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      task,
      startX: e.clientX,
      handle, // 'left' or 'right'
      originalStart: task.start,
      originalEnd: task.end,
      type: 'resize'
    });

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // 마우스 이동 처리 - 개선된 버전
  const handleMouseMove = useCallback((e) => {
    if (dragState) {
      const deltaX = e.clientX - dragState.initialX;
      const deltaY = e.clientY - dragState.initialY;
      
      // 최소 이동 거리 체크 완화 (2픽셀로 감소)
      if (Math.abs(deltaX) < 2) return;

      const daysDelta = pixelsToDays(deltaX);
      
      // 날짜 변화가 있을 때만 업데이트
      if (daysDelta !== 0) {
        const newStart = addDays(dragState.task.start, daysDelta);
        const newEnd = addDays(dragState.task.end, daysDelta);
        
        const updatedTask = {
          ...dragState.task,
          start: newStart,
          end: newEnd,
          duration: getDaysBetween(newStart, newEnd)
        };

        // console.log('Drag update disabled:', { daysDelta, newStart, newEnd, deltaX });
        // onTaskUpdate?.(updatedTask); // Disabled: No date updates from dragging
        
        // 드래그 시작 위치 업데이트 (스냅 방지)
        setDragState(prev => ({
          ...prev,
          initialX: e.clientX - (deltaX % (cellWidth / Math.abs(daysDelta || 1)))
        }));
      }
    }

    if (resizeState) {
      const deltaX = e.clientX - resizeState.startX;
      const daysDelta = pixelsToDays(deltaX);
      
      // 날짜 변화가 있을 때만 업데이트
      if (daysDelta !== 0) {
        let newStart = new Date(resizeState.originalStart);
        let newEnd = new Date(resizeState.originalEnd);
        
        if (resizeState.handle === 'left') {
          newStart = addDays(resizeState.originalStart, daysDelta);
          // 시작일이 종료일보다 늦을 수 없음 (최소 1일 공간)
          if (newStart >= newEnd) {
            newStart = addDays(newEnd, -1);
          }
        } else {
          newEnd = addDays(resizeState.originalEnd, daysDelta);
          // 종료일이 시작일보다 빠를 수 없음 (최소 1일 공간)
          if (newEnd <= newStart) {
            newEnd = addDays(newStart, 1);
          }
        }

        const updatedTask = {
          ...resizeState.task,
          start: newStart,
          end: newEnd,
          duration: getDaysBetween(newStart, newEnd)
        };

        // console.log('Resize update disabled:', { handle: resizeState.handle, daysDelta, newStart, newEnd, deltaX });
        // onTaskUpdate?.(updatedTask); // Disabled: No date updates from resizing
        
        // 리사이즈 시작 위치 업데이트 (스냅 방지)
        setResizeState(prev => ({
          ...prev,
          startX: e.clientX - (deltaX % (cellWidth / Math.abs(daysDelta || 1))),
          originalStart: newStart,
          originalEnd: newEnd
        }));
      }
    }
  }, [dragState, resizeState, pixelsToDays, onTaskUpdate, cellWidth]);

  // 마우스 버튼 놓기
  const handleMouseUp = useCallback(() => {
    if (dragState || resizeState) {
      setDragState(null);
      setResizeState(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
  }, [dragState, resizeState]);

  // 드래그 상태 확인
  const isDragging = dragState !== null;
  const isResizing = resizeState !== null;
  const isInteracting = isDragging || isResizing;

  return {
    dragState,
    resizeState,
    isDragging,
    isResizing,
    isInteracting,
    handleDragStart,
    handleResizeStart,
    handleMouseMove,
    handleMouseUp
  };
};

export default useDragAndDrop; 
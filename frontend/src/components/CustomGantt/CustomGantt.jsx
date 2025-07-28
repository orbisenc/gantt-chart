import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import GanttTimeline from './GanttTimeline';
import GanttTaskTable from './GanttTaskTable';
import GanttChart from './GanttChart';
import TaskEditModal from './TaskEditModal';
import ContextMenu from './ContextMenu';
import useKeyboardNavigation from './hooks/useKeyboardNavigation';
import { 
  buildTaskHierarchy, 
  flattenTaskHierarchy, 
  generateTimelineScale,
  getDaysBetween,
  calculateDynamicProgress,
  updateProgressCascade,
  calculateProjectAndPhaseValues,
  isTaskFieldEditable,
  canAddChildTask
} from './utils';

import { DEFAULT_CELL_WIDTH, DEFAULT_ROW_HEIGHT } from './types';
import './CustomGantt.css';
import { formatDate, generateUpperScales } from './utils';

const CustomGantt = forwardRef(({ 
  tasks = [], 
  columns = [], 
  scales = [], 
  markers = [], 
  cellWidth = DEFAULT_CELL_WIDTH,
  rowHeight = DEFAULT_ROW_HEIGHT,
  onTaskUpdate,
  onTaskSelect,
  onTaskAdd,
  onTaskDelete,
  zoomLevel,
  newTaskIdForEdit,
  onNewTaskEditComplete,
  taskManager, // 태스크 관리 함수들
  connections = [], // 연결 정보
  onConnectionCreate, // 연결 생성 핸들러
  onConnectionDelete, // 연결 삭제 핸들러
  isConnectionMode = false, // 네트워크 연결 모드
}, ref) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set([1, 10, 20, 30, 40, 50, 60, 70, 80, 90])); // 기본적으로 주요 태스크들을 확장
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [editingTask, setEditingTask] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: { x: 0, y: 0 }, task: null });
  const [dynamicCellWidth, setDynamicCellWidth] = useState(100);
  const [containerWidth, setContainerWidth] = useState(0);
  const [lastTaskCount, setLastTaskCount] = useState(0);
  const [pendingNewTaskId, setPendingNewTaskId] = useState(null);
  const [tableWidth, setTableWidth] = useState(400); // 테이블 너비 상태 (초기값은 나중에 계산됨)
  const [isResizing, setIsResizing] = useState(false); // 리사이징 중인지 여부
  const isResizingRef = useRef(false); // 리사이징 상태를 ref로도 관리
  const startXRef = useRef(0); // 드래그 시작 X 좌표
  const startWidthRef = useRef(400); // 드래그 시작 시 테이블 너비
  const [columnWidths, setColumnWidths] = useState({}); // 컬럼별 너비 상태
  
  const tableRef = useRef(null);
  const chartRef = useRef(null);
  const timelineRef = useRef(null);
  const ganttTimelineRef = useRef(null);

  // 프로젝트/단계의 값들이 자동 계산된 태스크 목록
  const tasksWithCalculatedProgress = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return calculateProjectAndPhaseValues(tasks);
  }, [tasks]);

  // 새 태스크 편집 모달 자동 열기
  useEffect(() => {
    if (newTaskIdForEdit && tasksWithCalculatedProgress.length > 0) {
      const taskToEdit = tasksWithCalculatedProgress.find(task => task.id === newTaskIdForEdit);
      if (taskToEdit) {
        // console.log("Opening edit modal for new task:", taskToEdit);
        setEditingTask(taskToEdit);
        setIsEditModalOpen(true);
        // 편집 모달이 열렸음을 부모에게 알림
        onNewTaskEditComplete?.();
      }
    }
  }, [newTaskIdForEdit, tasksWithCalculatedProgress, onNewTaskEditComplete]);

  // 태스크 계층 구조 생성 (진척도 계산된 태스크 사용)
  const hierarchyTasks = useMemo(() => {

    // 새로 추가된 태스크가 있는지 확인
    if (pendingNewTaskId) {
      const newTask = tasksWithCalculatedProgress.find(t => t.id === pendingNewTaskId);
    }

    const result = buildTaskHierarchy(tasksWithCalculatedProgress);
    //console.log("Hierarchy result:", result);
    
    // 계층 구조에서 플랫 태스크 목록 생성해서 개수 확인
    const flatFromHierarchy = flattenTaskHierarchy(result);
    //console.log("Flattened from hierarchy:", flatFromHierarchy.length);
    
    return result;
  }, [tasksWithCalculatedProgress, pendingNewTaskId]);
  
    // 플랫 태스크 목록 (렌더링용) - 성숙도 cascade 업데이트 적용
  const flatTasks = useMemo(() => {
    // tasksWithCalculatedProgress에서 직접 계층 구조를 계산
    const hierarchy = buildTaskHierarchy(tasksWithCalculatedProgress);
    const expanded = flattenTaskHierarchy(hierarchy);
    
    const filtered = expanded.filter(task => {
      // 루트 태스크(parent가 0이거나 없는 경우)는 항상 표시
      if (!task.parent || task.parent === 0) {
        return true;
      }
      
      // 부모가 접혀있으면 숨김
      let currentParent = task.parent;
      while (currentParent && currentParent !== 0) {
        if (!expandedTasks.has(currentParent)) {
          // console.log(`Task ${task.id} hidden because parent ${currentParent} is not expanded`);
          return false;
        }
        // 전체 태스크 목록에서 부모의 부모를 찾기
        const parentTask = tasksWithCalculatedProgress.find(t => t.id === currentParent);
        currentParent = parentTask?.parent;
        
        // 무한 루프 방지
        if (currentParent === task.parent) break;
      }
      return true;
    });
    
    // tasksWithCalculatedProgress에서 계산된 성숙도 정보를 필터링된 태스크에 적용
    return filtered.map(task => {
      const calculatedTask = tasksWithCalculatedProgress.find(t => t.id === task.id);
      if (calculatedTask && calculatedTask.maturity !== task.maturity) {
        // console.log(`Flat task ${task.id} (${task.text}): maturity updated from ${task.maturity} to ${calculatedTask.maturity}`);
      }
      return calculatedTask ? { ...task, maturity: calculatedTask.maturity } : task;
    });
  }, [tasksWithCalculatedProgress, expandedTasks]); // tasksWithCalculatedProgress에 의존하여 즉시 업데이트

  // 태스크 배열 변경 감지 및 새 태스크 자동 선택
  useEffect(() => {
    // 태스크가 추가되었는지 확인
    if (tasks.length > lastTaskCount) {
      // 새로 추가된 태스크 찾기
      const newTasks = tasks.filter(task => 
        !tasks.slice(0, lastTaskCount).some(oldTask => oldTask.id === task.id)
      );
      
      if (newTasks.length > 0) {
        const newestTask = newTasks[newTasks.length - 1];
        setPendingNewTaskId(newestTask.id);
      }
    }
    setLastTaskCount(tasks.length);
  }, [tasks.length, tasks, lastTaskCount]);

  // 새로 추가된 태스크가 flatTasks에 나타나면 자동 선택
  useEffect(() => {
    if (pendingNewTaskId) {
      const newTask = flatTasks.find(task => task.id === pendingNewTaskId);
      if (newTask) {
        setSelectedTask(newTask);
        setPendingNewTaskId(null);
      }
    }
  }, [flatTasks, pendingNewTaskId]);

  // 태스크 배열이 변경되었을 때 새로 추가된 태스크의 부모를 확장
  useEffect(() => {
    if (pendingNewTaskId && tasksWithCalculatedProgress.length > 0) {
      const newTask = tasksWithCalculatedProgress.find(task => task.id === pendingNewTaskId);
      if (newTask && newTask.parent && newTask.parent !== 0) {
        // console.log("Found new task, ensuring parent is expanded:", newTask);
        setExpandedTasks(prev => {
          const newExpanded = new Set(prev);
          
          // 부모 태스크와 그 상위 태스크들을 모두 확장
          let currentParentId = newTask.parent;
          while (currentParentId && currentParentId !== 0) {
            newExpanded.add(currentParentId);
            // 전체 태스크 목록에서 부모 태스크 찾기
            const parentTask = tasksWithCalculatedProgress.find(t => t.id === currentParentId);
            currentParentId = parentTask?.parent;
            
            // 무한 루프 방지
            if (currentParentId === newTask.parent) break;
          }
          
          // console.log("Updated expanded tasks:", Array.from(newExpanded));
          return newExpanded;
        });
      }
    }
  }, [tasksWithCalculatedProgress, pendingNewTaskId]);

  // 태스크 선택 핸들러
  function handleTaskSelect(task) {
    setSelectedTask(task);
    onTaskSelect?.(task);
  }

  // 태스크 더블클릭 핸들러 (편집 모달 열기)
  function handleTaskDoubleClick(task) {
    setEditingTask(task);
    setIsEditModalOpen(true);
  }

  // 컬럼 리사이즈 핸들러
  const handleColumnResize = useCallback((columnId, newWidth) => {
    // console.log('CustomGantt handleColumnResize called:', { columnId, newWidth });
    setColumnWidths(prev => {
      const updated = {
        ...prev,
        [columnId]: newWidth
      };
      // console.log('Updated columnWidths:', updated);
      return updated;
    });
  }, []);

  // 실제 컬럼 너비 계산 (columnWidths 상태 우선, 없으면 기본값)
  const getColumnWidth = useCallback((column) => {
    return columnWidths[column.id] || column.width || 120;
  }, [columnWidths]);

  // 컬럼 너비가 적용된 컬럼 배열
  const columnsWithWidth = useMemo(() => {
    return columns.map(column => ({
      ...column,
      width: getColumnWidth(column)
    }));
  }, [columns, getColumnWidth]);

  // 상위 레벨 태스크 추가 핸들러
  function handleAddRootTask() {
    const newTaskId = Date.now();
    
    // 새로 추가될 태스크 ID를 저장
    setPendingNewTaskId(newTaskId);
    
    // 상위 레벨 태스크 추가 (parent: 0)
    onTaskAdd?.(0); // null을 전달하면 parent: 0으로 설정됨
  }

  // 태스크 추가 핸들러
  function handleTaskAdd(parentId = null) {
    const newTaskId = Date.now();
    
    // 새로 추가될 태스크 ID를 저장
    setPendingNewTaskId(newTaskId);
    
    onTaskAdd?.(parentId);
  }

  // 태스크 삭제 핸들러
  function handleTaskDelete(taskId) {
    // 자식 태스크가 있는지 확인
    const hasChildren = tasksWithCalculatedProgress.some(task => task.parent === taskId);
    
    if (hasChildren) {
      if (!window.confirm('하위 태스크가 있습니다. 모든 하위 태스크도 함께 삭제됩니다. 계속하시겠습니까?')) {
        return;
      }
    }
    
    onTaskDelete?.(taskId);
    
    // 삭제된 태스크가 선택되어 있으면 선택 해제
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(null);
    }
  }

  // 키보드 탐색 훅
  useKeyboardNavigation({
    tasks: flatTasks,
    selectedTask,
    onTaskSelect: handleTaskSelect,
    onTaskEdit: handleTaskDoubleClick,
    onTaskDelete: handleTaskDelete,
    onTaskAdd: handleTaskAdd
  });

  // 총 column width 계산
  const totalColumnWidth = useMemo(() => {
    return columnsWithWidth.reduce((total, column) => total + (column.width || 100), 0);
  }, [columnsWithWidth]);

  // columns가 변경될 때 tableWidth 자동 조정
  useEffect(() => {
    const newMaxWidth = totalColumnWidth + 5;
    if (tableWidth > newMaxWidth) {
      setTableWidth(newMaxWidth);
      // console.log(`Table width adjusted to max: ${newMaxWidth} (total column width: ${totalColumnWidth})`);
    }
  }, [totalColumnWidth, tableWidth]);

  // 리사이징 핸들러들을 useCallback으로 메모이제이션
  const handleResizeMove = useCallback((e) => {
    if (!isResizingRef.current) return;
    // console.log("handleResizeMove called");
    
    // 드래그 시작점부터의 상대적인 이동 거리 계산
    const deltaX = e.clientX - startXRef.current;
    const minWidth = 200;
    const maxWidth = totalColumnWidth + 50; // 총 column width + 여유 공간
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));
    
    setTableWidth(newWidth);
    // console.log(`Table width set to: ${newWidth} (delta: ${deltaX}, max: ${maxWidth})`);
    
    // 리사이징 중에는 전체 페이지의 커서 스타일 변경
    document.body.style.cursor = 'col-resize';
    
    // 텍스트 선택 방지
    e.preventDefault();
  }, [totalColumnWidth]);

  const handleResizeEnd = useCallback(() => {
    // console.log("handleResizeEnd called");
    isResizingRef.current = false;
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // 리사이징 시작 핸들러
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    // console.log("handleResizeStart");
    // console.log(" -handleResizeStart clientX: ", e.clientX);
    // console.log(" -handleResizeStart buttons: ", e.buttons);
    // console.log(" -handleResizeStart current tableWidth: ", tableWidth);
    
    // 드래그 시작 좌표와 현재 테이블 너비 저장
    startXRef.current = e.clientX;
    startWidthRef.current = tableWidth;
    
    isResizingRef.current = true;
    setIsResizing(true);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // 텍스트 선택 방지
  }, [tableWidth]);

  // 컴포넌트 언마운트 시 이벤트 리스너 제거
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // 프로젝트 시작일과 종료일 계산
  const projectBounds = useMemo(() => {
    if (tasksWithCalculatedProgress.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = tasksWithCalculatedProgress.flatMap(task => [task.start, task.end]).filter(Boolean);
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return { start, end };
  }, [tasksWithCalculatedProgress]);

  // 타임라인 스케일 생성
  const timelineScale = useMemo(() => {
    if (scales.length === 0) return [];
    const unit = scales[0].unit || zoomLevel || 'month';
    return generateTimelineScale(projectBounds.start, projectBounds.end, unit);
  }, [projectBounds, scales, zoomLevel]);

  // 타임라인 높이 계산 - rowHeight와 통일
  const fixedCellHeight = rowHeight;
  const upperScales = useMemo(() => {
    if (timelineScale.length === 0) return [];
    const unit = timelineScale[0]?.unit;
    return generateUpperScales(timelineScale, zoomLevel);
  }, [timelineScale, zoomLevel]);
  
  const maxLevel = upperScales.length > 0 ? Math.max(...upperScales.map(s => s.level)) : 0;
  const timelineHeight = (maxLevel + 2) * fixedCellHeight; // 상위 스케일 + 기본 스케일

  // ResizeObserver를 사용하여 gantt-timeline 컨테이너 크기 변화 감지
  useEffect(() => {
    if (!ganttTimelineRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setContainerWidth(newWidth);
        
        // 동적 셀 넓이 계산
        if (timelineScale.length > 0) {
          const minCellWidth = 60; // 최소 셀 넓이
          const maxCellWidth = 200; // 최대 셀 넓이
          const cellGap = 2;
          
          // 사용 가능한 너비에서 간격을 제외한 실제 셀 넓이 계산
          const availableWidth = newWidth - (timelineScale.length - 1) * cellGap;
          const calculatedCellWidth = Math.max(minCellWidth, Math.min(maxCellWidth, availableWidth / timelineScale.length));
          
          setDynamicCellWidth(calculatedCellWidth);
        }
      }
    });

    resizeObserver.observe(ganttTimelineRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [timelineScale?.length]);

  // 태스크 우클릭 핸들러 (컨텍스트 메뉴)
  const handleTaskRightClick = (e, task) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      task
    });
  };

  // 컨텍스트 메뉴 닫기
  const handleContextMenuClose = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, task: null });
  };

  // 태스크 확장/축소 핸들러
  const handleTaskExpand = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // 스크롤 동기화
  const handleScroll = (direction, value) => {
    if (direction === 'horizontal') {
      setScrollLeft(value);
      // 동기화 제거 - 독립적으로 스크롤
    } else if (direction === 'vertical') {
      setScrollTop(value);
      // 동기화 제거 - 독립적으로 스크롤
    }
  };

  // 태스크 업데이트 핸들러
  const handleTaskUpdate = (updatedTask) => {
    onTaskUpdate?.(updatedTask);
  };

  // 진행률 변경 핸들러 (cascade 업데이트 포함)
  const handleProgressChange = (taskId, newProgress) => {
    // 마일스톤은 진척도가 없으므로 처리하지 않음
    const task = tasks.find(t => t.id === taskId);
    if (task && task.type === 'milestone') {
      return;
    }
    
    // cascade 업데이트를 통해 상위 태스크들의 진척도도 자동 계산
    const updatedTasks = updateProgressCascade(tasks, taskId, newProgress);
    
    // 변경된 모든 태스크들을 업데이트
    updatedTasks.forEach(updatedTask => {
      const originalTask = tasks.find(t => t.id === updatedTask.id);
      if (originalTask) {
        // 마일스톤의 경우 progress 필드가 제거되었을 수 있음
        const originalProgress = originalTask.progress;
        const updatedProgress = updatedTask.progress;
        
        if (originalProgress !== updatedProgress) {
          handleTaskUpdate(updatedTask);
        }
      }
    });
  };

  // 편집 모달 닫기
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  // 편집 모달 저장
  const handleEditModalSave = (updatedTask) => {
    // console.log('CustomGantt handleEditModalSave called with:', updatedTask);
    // console.log('Task start date:', updatedTask.start);
    // console.log('Task end date:', updatedTask.end);
    // console.log('Calling handleTaskUpdate...');
    handleTaskUpdate(updatedTask);
    handleEditModalClose();
  };

  // 편집 모달 삭제
  const handleEditModalDelete = (taskId) => {
    handleTaskDelete(taskId);
    handleEditModalClose();
  };


  // 오늘 날짜로 스크롤
  const scrollToToday = () => {
    const today = new Date();
    const todayPosition = calculateTodayPosition(today);
    
    if (todayPosition !== null) {
      const containerWidth = 400; // 기본 컨테이너 너비
      const scrollPosition = Math.max(0, todayPosition - containerWidth / 2);
      
      // gantt-timeline 컨테이너를 찾아서 스크롤
      const timelineContainer = document.querySelector('.gantt-timeline');
      if (timelineContainer) {
        timelineContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  };

  // 오늘 날짜의 픽셀 위치 계산 (동적 셀 넓이 사용)
  const calculateTodayPosition = (today) => {
    if (timelineScale.length === 0) return null;
    
    const cellGap = 2;
    const todayTime = today.getTime();
    const firstDate = timelineScale[0].date;
    const lastDate = timelineScale[timelineScale.length - 1].date;
    
    if (todayTime < firstDate.getTime() || todayTime > lastDate.getTime()) {
      return null;
    }
    
    for (let i = 0; i < timelineScale.length; i++) {
      const currentDate = timelineScale[i].date;
      const nextDate = i < timelineScale.length - 1 ? timelineScale[i + 1].date : null;
      
      if (nextDate && todayTime >= currentDate.getTime() && todayTime < nextDate.getTime()) {
        const cellProgress = (todayTime - currentDate.getTime()) / (nextDate.getTime() - currentDate.getTime());
        return i * (dynamicCellWidth + cellGap) + cellProgress * dynamicCellWidth;
      }
    }
    
    return (timelineScale.length - 1) * (dynamicCellWidth + cellGap);
  };

  // ref를 통해 외부에서 접근 가능한 메서드들 노출
  useImperativeHandle(ref, () => ({
    scrollToToday
  }), [dynamicCellWidth, timelineScale]);

  // 컴포넌트 마운트 시 오늘 날짜로 스크롤
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     scrollToToday();
  //   }, 500);
    
  //   return () => clearTimeout(timer);
  // }, [timelineScale]);
 
  return (
    <div className="custom-gantt" ref={ref} style={{ display: 'flex', flexDirection: 'row' }}>
      {/* 컨트롤 버튼 영역 */}
      {/* 왼쪽: Task Table */}
      <div 
        className="gantt-task-table"
        style={{
          overflowY: 'auto', // 상하 스크롤 활성화
          overflowX: 'auto',
          width: `${tableWidth}px`,
          minWidth: '200px',
          maxWidth: `${totalColumnWidth}px` // 총 column width
        }}
        onScroll={(e) => {
          const scrollLeft = e.target.scrollLeft;
          const scrollTop = e.target.scrollTop;
          
          // gantt-timeline과 상하 스크롤 동기화
          const timelineContainer = e.target.closest('.custom-gantt').querySelector('.gantt-timeline');
          if (timelineContainer) {
            timelineContainer.scrollTop = scrollTop;
          }
          
          // 전역 스크롤 상태 업데이트
          setScrollLeft(scrollLeft);
          setScrollTop(scrollTop);
        }}
      >
        <div className="gantt-task-table-header" style={{ height: `${timelineHeight}px` }}>
          <GanttTaskTable
            ref={tableRef}
            tasks={flatTasks}
            allTasks={tasksWithCalculatedProgress}
            columns={columnsWithWidth}
            selectedTask={selectedTask}
            expandedTasks={expandedTasks}
            cellWidth={cellWidth}
            rowHeight={rowHeight}
            headerHeight={timelineHeight}
            onTaskSelect={handleTaskSelect}
            onTaskExpand={handleTaskExpand}
            onTaskAdd={handleTaskAdd}
            onTaskDelete={handleTaskDelete}
            onTaskRightClick={handleTaskRightClick}
            onTaskUpdate={handleTaskUpdate}
            onColumnResize={handleColumnResize}
            onScroll={(scrollTop) => handleScroll('vertical', scrollTop)}
            isHeader={true}
            disableScroll={true}
          />
        </div>
        <div className="gantt-task-table-body">
          <GanttTaskTable
            ref={tableRef}
            tasks={flatTasks}
            allTasks={tasksWithCalculatedProgress}
            columns={columnsWithWidth}
            selectedTask={selectedTask}
            expandedTasks={expandedTasks}
            cellWidth={cellWidth}
            rowHeight={rowHeight}
            headerHeight={timelineHeight}
            onTaskSelect={handleTaskSelect}
            onTaskExpand={handleTaskExpand}
            onTaskAdd={handleTaskAdd}
            onTaskDelete={handleTaskDelete}
            onTaskRightClick={handleTaskRightClick}
            onTaskUpdate={handleTaskUpdate}
            onColumnResize={handleColumnResize}
            onScroll={(scrollTop) => handleScroll('vertical', scrollTop)}
            isHeader={false}
            disableScroll={true}
          />
        </div>
      </div>

      {/* 리사이저 - 테이블과 타임라인 사이의 드래그 가능한 구분선 */}
      <div 
        className="gantt-resizer"
        style={{
          width: '8px',
          height: '100%',
          background: '#e0e0e0',
          cursor: 'col-resize',
          position: 'relative',
          zIndex: 10,
          boxShadow: isResizing ? '0 0 5px rgba(0, 0, 0, 0.3)' : 'none',
          transition: isResizing ? 'none' : 'box-shadow 0.2s'
        }}
        onMouseDown={handleResizeStart}
      >
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '30px',
            background: '#999',
            borderRadius: '1px'
          }}
        />
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateX(-2px)',
            width: '2px',
            height: '20px',
            background: '#999',
            borderRadius: '1px'
          }}
        />
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateX(2px)',
            width: '2px',
            height: '20px',
            background: '#999',
            borderRadius: '1px'
          }}
        />
      </div>

      {/* 오른쪽: Timeline */}
      <div 
        className="gantt-timeline"
        style={{
          overflowY: 'auto', // 상하 스크롤 활성화
          overflowX: 'auto', // 좌우 스크롤 활성화
          flex: 1 // 남은 공간을 모두 차지
        }}
        onScroll={(e) => {
          const scrollLeft = e.target.scrollLeft;
          const scrollTop = e.target.scrollTop;
          
          // gantt-task-table과 상하 스크롤 동기화
          const taskTableContainer = e.target.closest('.custom-gantt').querySelector('.gantt-task-table');
          if (taskTableContainer) {
            taskTableContainer.scrollTop = scrollTop;
          }
          
          // 전역 스크롤 상태 업데이트
          setScrollLeft(scrollLeft);
          setScrollTop(scrollTop);
        }}
      >
        <div 
          className="gantt-timeline"
          ref={ganttTimelineRef}
          style={{
            height: `${timelineHeight + (flatTasks.length * rowHeight)+2}px`,
            minHeight: `${timelineHeight + (flatTasks.length * rowHeight)+2}px`,
            position: 'relative'
          }}
        >
          <div 
            className="gantt-timeline-header" 
            style={{
              height: `${timelineHeight}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2
            }}
          >
            <GanttTimeline
              scale={timelineScale}
              cellWidth={dynamicCellWidth}
              rowHeight={rowHeight}
              markers={markers}
              scrollLeft={scrollLeft}
              zoomLevel={zoomLevel}
            />
          </div>
          <div 
            className="gantt-timeline-body"
            style={{
              height: `${flatTasks.length * rowHeight+1}px`,
              position: 'absolute',
              top: `${timelineHeight}px`,
              left: 0,
              zIndex: 1
            }}
          >
            <GanttChart
              ref={chartRef}
              tasks={flatTasks}
              timelineScale={timelineScale}
              projectStart={projectBounds.start}
              cellWidth={dynamicCellWidth}
              rowHeight={rowHeight}
              selectedTask={selectedTask}
              markers={markers}
              onTaskSelect={handleTaskSelect}
              onTaskUpdate={handleTaskUpdate}
              onTaskDoubleClick={handleTaskDoubleClick}
              onTaskRightClick={handleTaskRightClick}
              onProgressChange={handleProgressChange}
              connections={connections}
              onConnectionCreate={onConnectionCreate}
              onConnectionDelete={onConnectionDelete}
              isConnectionMode={isConnectionMode}
            />
            
            {/* gantt-timeline-body의 맨 오른쪽 끝 수직 라인 */}
            {/*<div
              className="gantt-timeline-body-right-border"
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '2px',
                height: '100%',
                backgroundColor: '#d1d5db',
                zIndex: 10
              }}
            />*/}
          </div>
          
          {/* gantt-timeline-body의 맨 아랫부분 수평 라인 */}
          <div
            className="gantt-timeline-body-bottom-border"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: '#e6e6e6',
              zIndex: 10
            }}
          />
        </div>
      </div>

      {/* 태스크 편집 모달 */}
      <TaskEditModal
        task={editingTask}
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSave={handleEditModalSave}
        onDelete={handleEditModalDelete}
        taskManager={taskManager} // 태스크 관리 함수들 전달
        allTasks={tasksWithCalculatedProgress} // 전체 태스크 배열 전달 (관계 분석용)
      />

      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        task={contextMenu.task}
        onClose={handleContextMenuClose}
        onEdit={handleTaskDoubleClick}
        onDelete={handleTaskDelete}
        onAddChild={handleTaskAdd}
        onAddSibling={handleTaskAdd}
      />

      {/* 도움말 툴팁 */}
      {/* {selectedTask && (
        <div className="gantt-help-tooltip">
          <div>💡 <strong>도움말</strong></div>
          <div>• 더블클릭 / Enter: 편집</div>
          <div>• 우클릭: 컨텍스트 메뉴</div>
          <div>• 드래그: 이동</div>
          <div>• 모서리 드래그: 크기 조정</div>
          <div>• 진행률 바 클릭: 진행률 조정</div>
          <div>• ↑↓: 태스크 선택</div>
          <div>• Delete: 삭제</div>
          <div>• ESC: 선택 해제</div>
          <div>• Insert: 하위 태스크 추가</div>
        </div>
      )} */}
    </div>
  );
});

export default CustomGantt; 
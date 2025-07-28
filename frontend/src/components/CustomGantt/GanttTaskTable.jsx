import React, { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { formatDate, formatNumberWithCommas } from './utils';
import { MaturityType, MaturityLabels, TaskTypeLabels, TaskSubType } from './types';

const GanttTaskTable = forwardRef(({ 
  tasks = [], 
  allTasks = [], // 전체 태스크 배열 (하위 테스크 검색용)
  columns = [], 
  selectedTask = null,
  expandedTasks = new Set(),
  cellWidth = 50,
  rowHeight = 32,
  headerHeight = 96, // 헤더 높이를 prop으로 받음
  onTaskSelect,
  onTaskExpand,
  onTaskAdd,
  onTaskDelete,
  onTaskRightClick,
  onTaskUpdate, // 태스크 업데이트 핸들러 추가
  onScroll,
  onColumnResize, // 컬럼 리사이즈 핸들러 추가
  isHeader = false,
  disableScroll = false
}, ref) => {
  const containerRef = useRef(null);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, width: 0 });
  const resizingColumnRef = useRef(null); // Ref to track current resizing column immediately
  const dragStartRef = useRef({ x: 0, width: 0 }); // Ref to track drag start immediately

  useEffect(() => {
    if (ref) {
      ref.current = containerRef.current;
    }
  }, [ref]);

  const handleScroll = (e) => {
    // 상하 스크롤이 비활성화되었으므로 좌우 스크롤만 처리
    const newScrollLeft = e.target.scrollLeft;
    // 필요시 좌우 스크롤 이벤트를 상위 컴포넌트로 전달
    // onScroll?.(newScrollLeft);
  };

  const handleTaskClick = (task) => {
    onTaskSelect?.(task);
  };

  const handleTaskRightClick = (e, task) => {
    e.preventDefault();
    onTaskRightClick?.(e, task);
  };

  const handleExpandClick = (e, taskId) => {
    e.stopPropagation();
    e.preventDefault();
    // console.log('Expand clicked for task:', taskId, 'Current expanded tasks:', expandedTasks);
    onTaskExpand?.(taskId);
  };

  const handleAddTask = (e, parentId = null) => {
    e.stopPropagation();
    e.preventDefault();
    // console.log('Add task clicked for parent:', parentId);
    onTaskAdd?.(parentId);
  };

  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    e.preventDefault();
    // console.log('Delete task clicked for task:', taskId);
    onTaskDelete?.(taskId);
  };

  const getMaturityStyle = (maturity) => {
    switch (maturity) {
      case MaturityType.DRAFT:
        return {
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeaa7'
        };
      case MaturityType.IN_PROGRESS:
        return {
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb'
        };
      case MaturityType.COMPLETED:
        return {
          backgroundColor: '#f8f9fa',
          color: '#495057',
          border: '1px solid #dee2e6'
        };
      default:
        return {
          backgroundColor: '#fff',
          color: '#495057',
          border: '1px solid #ced4da'
        };
    }
  };

  const handleMaturityChange = (taskId, newMaturity) => {
    // console.log('Maturity changed for task:', taskId, 'to:', newMaturity);
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = { ...task, maturity: newMaturity };
      onTaskUpdate?.(updatedTask);
    }
  };

  // 컬럼 리사이즈 핸들러들 - 순서 중요: Move와 End를 먼저 정의
  const handleResizeMove = useCallback((e) => {
    const currentResizingColumn = resizingColumnRef.current;
    if (!currentResizingColumn) {
      // console.log('No resizing column ref, returning');
      return;
    }

    const deltaX = e.clientX - dragStartRef.current.x;
    const newWidth = Math.max(80, dragStartRef.current.width + deltaX); // 최소 너비 80px
    
    // console.log('Resizing column:', currentResizingColumn, 'New width:', newWidth, 'Delta:', deltaX);
    onColumnResize?.(currentResizingColumn, newWidth);
  }, [onColumnResize]);

  const handleResizeEnd = useCallback(() => {
    // console.log('Resize end called');
    setResizingColumn(null);
    setDragStart({ x: 0, width: 0 });
    resizingColumnRef.current = null;
    dragStartRef.current = { x: 0, width: 0 };

    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log('handleResizeStart called for column:', columnId, 'onColumnResize exists:', !!onColumnResize);
    
    const column = columns.find(col => col.id === columnId);
    if (!column) {
      // console.log('Column not found:', columnId);
      return;
    }

    // console.log('Starting resize for column:', column);
    setResizingColumn(columnId);
    resizingColumnRef.current = columnId; // Set ref immediately
    // console.log("resizingColumn state: ", resizingColumn, "resizingColumn ref:", resizingColumnRef.current);
    
    const dragInfo = {
      x: e.clientX,
      width: column.width || 120
    };
    setDragStart(dragInfo);
    dragStartRef.current = dragInfo; // Set ref immediately

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columns, handleResizeMove, handleResizeEnd, onColumnResize]);

  // 컴포넌트 언마운트 시 이벤트 리스너 정리
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleResizeMove, handleResizeEnd]);

  const renderCellContent = (task, column) => {
    const { id, template } = column;

    if (template && typeof template === 'function') {
      return template(task);
    }
    
    switch (id) {
      case 'text':
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            width: '100%'
          }}>
            {/* 레벨별 들여쓰기 */}
            <div style={{ 
              width: `${(task.level || 0) * 24}px`,
              flexShrink: 0
            }} />
            
            {/* 왼쪽 삼각형 토글 버튼 - 독립적으로 배치 */}
            {(() => {
              // 전체 태스크 배열에서 현재 태스크를 부모로 하는 다른 태스크들이 있는지 확인
              const hasChildren = allTasks.some(t => t.parent === task.id);
              
              if (hasChildren) {
                return (
                  <button
                    className={`gantt-tree-toggle ${expandedTasks.has(task.id) ? 'expanded' : ''}`}
                    onClick={(e) => handleExpandClick(e, task.id)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    title={expandedTasks.has(task.id) ? '축소' : '확장'}
                    style={{
                      zIndex: 10,
                      position: 'relative',
                      pointerEvents: 'auto'
                    }}
                  />
                );
              }
              return (
                <div style={{ width: '16px', marginRight: '8px' }}></div>
              );
            })()}
            
            {/* 태스크 텍스트 영역 */}
            <div className="gantt-task-text" style={{ 
              display: 'flex', 
              alignItems: 'center',
              flex: 1,
              paddingLeft: 0 // CSS의 레벨별 padding 무시
            }}>
              <span 
                className="gantt-task-text-content"
                style={{ fontWeight: task.type === 'summary' ? 'bold' : 'normal' }}
              >
                {task.text}
              </span>
            </div>
          </div>
        );
      case 'progress':
        return task.subType === TaskSubType.MILESTONE ? '-' : `${task.progress}%`;
      case 'price':
        return task.subType === TaskSubType.MILESTONE ? '-' : task.price;
      case 'task_type':
        const getTypeDisplayText = (task) => {
          // 마일스톤인 경우
          if (task.subType === 'milestone') {
            return '마일스톤';
          }
          // 일반 타입인 경우
          return TaskTypeLabels[task.type] || '일반태스크';
        };
        const typeText = getTypeDisplayText(task);
        const getTypeStyle = (typeText) => {
          switch (typeText) {
            case '프로젝트':
              return {
                backgroundColor: '#f3e5f5',
                color: '#7b1fa2',
                border: '1px solid #e1bee7'
              };
            case '단계':
              return {
                backgroundColor: '#f1f8e9',
                color: '#558b2f',
                border: '1px solid #c8e6c9'
              };
            case '마일스톤':
              return {
                backgroundColor: '#fff3e0',
                color: '#ef6c00',
                border: '1px solid #ffcc02'
              };
            default: // 일반태스크
              return {
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                border: '1px solid #bbdefb'
              };
          }
        };
        const typeStyle = getTypeStyle(typeText);
        return (
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
              ...typeStyle
            }}
          >
            {typeText}
          </div>
        );
      case 'price_ratio':
        return `${task.price_ratio}%`;
      case 'maturity':
        const maturityLabel = MaturityLabels[task.maturity] || MaturityLabels[MaturityType.DRAFT];
        const maturityStyle = getMaturityStyle(task.maturity);
        return (
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              textAlign: 'center',
              ...maturityStyle
            }}
          >
            {maturityLabel}
          </div>
        );
      case 'action':
        return (
          <div className="gantt-task-actions">
            <button
              onClick={(e) => handleAddTask(e, task.id)}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              style={{
                padding: '2px 6px',
                marginRight: '5px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: '#f8f9fa',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="하위 태스크 추가"
            >
              +
            </button>
            <button
              onClick={(e) => handleDeleteTask(e, task.id)}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              style={{
                padding: '2px 6px',
                border: '1px solid #dc3545',
                borderRadius: '3px',
                background: '#f8f9fa',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="태스크 삭제"
            >
              ×
            </button>
          </div>
        );
      default:
        return task[id] || '';
    }
  };

  const getTaskRowStyle = (task) => {
    const baseStyle = {
      height: `${rowHeight}px`, // rowHeight 사용
      display: 'flex',
      cursor: 'pointer',
      backgroundColor: selectedTask?.id === task.id ? '#c0cdf1' : 'transparent',
      alignItems: 'center', // 수직 중앙 정렬
      boxSizing: 'border-box',
      minHeight: `${rowHeight}px`, // 최소 높이 보장
      maxHeight: `${rowHeight}px`, // 최대 높이 제한
      lineHeight: 1, // 라인 높이 정규화
      position: 'relative', // border line을 위한 position 설정
      width: `${totalWidth}px`, // 실제 컬럼 너비 합계 사용
      minWidth: `${totalWidth}px`, // 최소 너비 보장
      flexShrink: 0, // 크기 축소 방지
    };

    return baseStyle;
  };

  const getCellStyle = (column) => {
    return {
      width: column.width || 120,
      minWidth: column.width || 120,
      maxWidth: column.width || 120,
      padding: '0 5px', // 상하 패딩 제거, 좌우만 유지
      borderRight: '1px solid #e6e6e6',
      display: 'flex',
      alignItems: 'center',
      textAlign: column.align || 'left',
      fontSize: '14px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      height: '100%',
      flexShrink: 0, // 컬럼 너비 고정
      flexGrow: 0, // 컬럼 너비 고정
    };
  };

  if (isHeader) {
    // 전체 컬럼 너비 계산
    const totalWidth = columns.reduce((sum, col) => sum + (col.width || 120), 0);
    
    return (
      <div className="gantt-table-header">
        <div
          className="gantt-table-header-row"
          style={{
            height: `${headerHeight}px`, // 헤더는 3배 높이
            display: 'flex',
            backgroundColor: '#f2f3f7',
            fontWeight: '600',
            alignItems: 'center', // 수직 중앙 정렬
            position: 'relative', // border line을 위한 position 설정
            width: `${totalWidth}px`, // 실제 컬럼 너비 합계 사용
            minWidth: `${totalWidth}px`, // 최소 너비 보장
            flexShrink: 0, // 크기 축소 방지
          }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="gantt-table-header-cell"
              style={{
                ...getCellStyle(column),
                position: 'relative',
                overflow: 'visible' // Allow resizer to extend beyond cell
              }}
            >
              {column.header}
              {/* 리사이저 핸들 - text(Task Name)와 price(Budget) 컬럼에만 추가 */}
              {(column.id === 'text' || column.id === 'price') && (
                <div
                  className="column-resizer"
                  style={{
                    position: 'absolute',
                    right: '-3px', // 더 확실한 위치 조정
                    top: 0,
                    bottom: 0,
                    width: '8px', // 클릭 영역 더 확대
                    cursor: 'col-resize',
                    backgroundColor: resizingColumn === column.id ? 'rgba(0, 122, 204, 0.3)' : 'transparent',
                    borderRight: resizingColumn === column.id ? '2px solid #007acc' : '2px solid transparent',
                    zIndex: 1000, // z-index 더 크게
                    userSelect: 'none',
                    pointerEvents: 'auto' // 마우스 이벤트 확실히 받도록
                  }}
                  onMouseDown={(e) => {
                    // console.log('Resizer mousedown for column:', column.id, 'Event:', e);
                    e.preventDefault();
                    e.stopPropagation();
                    handleResizeStart(e, column.id);
                  }}
                  onMouseEnter={(e) => {
                    if (resizingColumn !== column.id) {
                      e.target.style.borderRight = '2px solid #007acc';
                      e.target.style.backgroundColor = 'rgba(0, 122, 204, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (resizingColumn !== column.id) {
                      e.target.style.borderRight = '2px solid transparent';
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 전체 컬럼 너비 계산
  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 120), 0);
  
  return (
    <div
      ref={containerRef}
      className="gantt-task-table"
      style={{
        overflowY: 'hidden', // 상하 스크롤 비활성화
        overflowX: disableScroll ? 'hidden' : 'auto', // disableScroll이 true면 좌우 스크롤도 비활성화
        height: '100%',
        width: `${totalWidth}px`, // 실제 컬럼 너비 합계 사용
        minWidth: `${totalWidth}px`, // 최소 너비 보장
      }}
      onScroll={disableScroll ? undefined : handleScroll}
    >
      {tasks.map((task) => (
        <div
          key={task.id}
          className="gantt-task-row"
          style={getTaskRowStyle(task)}
          data-level={task.level}
          onClick={() => handleTaskClick(task)}
          onContextMenu={(e) => handleTaskRightClick(e, task)}
          tabIndex={0}
          role="button"
          aria-selected={selectedTask?.id === task.id}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTaskClick(task);
            }
          }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="gantt-task-cell"
              style={getCellStyle(column)}
            >
              {renderCellContent(task, column)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

GanttTaskTable.displayName = 'GanttTaskTable';

export default GanttTaskTable; 
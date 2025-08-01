import React, { useState, useRef } from 'react';
import { getTaskTypeClass } from '../../utils/utils';
import { getTaskColorByMaturity, shouldShowDraftWarning, isTaskOverdue } from '../../utils/maturityUtils';
import { MaturityType, TaskSubType } from '../../utils/types';
import { ReactFlow, Handle, ReactFlowProvider } from '@xyflow/react';


const GanttTask = ({ 
  task, 
  position, 
  isSelected = false,
  isConnecting = false,
  selectedHandle = null,
  onMouseDown,
  onDoubleClick,
  onRightClick,
  onHandleClick,
  cellWidth,
}) => {
  const { x, y, width, height } = position;
  const [isHovered, setIsHovered] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const taskRef = useRef(null);

  const getTaskStyle = () => {
    // z-index 계산: 일반태스크 > 마일스톤 > 프로젝트 > Phase 순으로 우선순위 설정
    const getZIndex = () => {
      const baseZ = isSelected ? 20 : 10;
      switch (task.type) {
        case 'task':
          return task.subType === TaskSubType.MILESTONE ? baseZ + 5 : baseZ + 10; // 일반태스크가 가장 높음
        case 'project':
          return baseZ + 2;
        case 'phase':
          return baseZ; // Phase가 가장 낮음
        default:
          return baseZ;
      }
    };

    const baseStyle = {
      position: 'absolute',
      left: x,
      top: y,
      width: width,
      height: height,
      cursor: 'pointer',
      zIndex: getZIndex(),
      border: isSelected ? '2px solid #1f6bd9' : '1px solid transparent',
      borderRadius: '3px',
      display: 'flex',
      alignItems: 'center',
      fontSize: `${Math.max(10, Math.min(14, height * 0.4))}px`,
      color: task.maturity === MaturityType.COMPLETED ? '#ffffff' : '#fff',
      fontWeight: '500',
      overflow: 'hidden',
      userSelect: 'none',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      boxShadow: isHovered 
        ? '0 2px 8px rgba(0,0,0,0.2)' 
        : '0 1px 3px rgba(0,0,0,0.1)'
    };

    // 마일스톤인 경우 특별한 스타일 적용
    if (task.subType === TaskSubType.MILESTONE) {
      return {
        ...baseStyle,
        backgroundColor: '#ad44ab',
        background: '#ad44ab',
        transform: 'rotate(45deg)',
        borderRadius: '3px',
        width: 16, // 셀 높이에 맞춤
        height: 16,
        left: x - 8 + width/2,
        top: y + 4,
        cursor: 'pointer',
        display: 'block',
        minWidth: 0,
        minHeight: 0
      };
    }
    
    // 태스크 타입에 따른 스타일 적용
    switch (task.type) {
      case 'phase':
        const phaseColor = '#00ba94'; // 고정된 녹색 사용
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          background: 'transparent',
          border: `2px dashed ${phaseColor}`,
          color: phaseColor,
          cursor: 'pointer'
        };
      case 'project':
        const projectColor = getTaskColorByMaturity(task.maturity, '#9c27b0', task);
        return {
          ...baseStyle,
          backgroundColor: `${projectColor} !important`,
          background: projectColor,
          color: '#ffffff',
          fontWeight: 'bold',
          cursor: 'pointer',
          position: 'absolute',
          left: x,
          top: y,
          width: width,
          height: height,

        };
      case 'task':
      default:
        const taskColor = getTaskColorByMaturity(task.maturity, '#3983eb', task);
        return {
          ...baseStyle,
          backgroundColor: `${taskColor} !important`,
          background: taskColor,
          color: '#fff'
        };
    }
  };

  const getProgressStyle = () => {
    if (task.type === 'milestone' || task.type === 'phase') return null;
    
    const progress = task.progress || 0;
    
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: `${progress}%`,
      backgroundColor: progress > 0 ? 'rgba(46, 204, 113, 0.9)' : 'transparent',
      borderRadius: '3px',
      zIndex: 1,
      transition: 'width 0.3s ease',
      minWidth: progress > 0 ? '2px' : '0px'
    };
  };

  const getTaskText = () => {
    if (task.type === 'milestone' || task.type === 'phase') return '';
    
    const textWidth = width - 20; // 패딩 및 핸들 고려
    if (textWidth < 40) return ''; // 너무 좁으면 텍스트 숨김
    
    return task.text;
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 깜빡임 방지를 위해 약간의 지연 추가
    setTimeout(() => {
      onMouseDown?.(e);
    }, 0);
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick?.(task);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRightClick?.(e, task);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const getHandleStyle = (handleType) => {
    const isSelected = selectedHandle && selectedHandle.taskId === task.id && selectedHandle.handleType === handleType;
    const shouldShow = isHovered || isConnecting || isHandleHovered;
    
    return {
      opacity: shouldShow ? 1 : 0,
      visibility: shouldShow ? 'visible' : 'hidden',
      transition: 'opacity 0.2s ease, visibility 0.2s ease',
      backgroundColor: isSelected ? '#ff4444' : '#1f6bd9',
      border: `2px solid ${isSelected ? '#ffffff' : '#ffffff'}`,
      borderRadius: '50%',
      width: '8px',
      height: '8px',
      zIndex: 20,
      cursor: 'pointer',
      position: 'absolute'
    };
  };

  const handleHandleClick = (e, handleType) => {
    e.preventDefault();
    e.stopPropagation();
    onHandleClick?.(task.id, handleType);
  };

  const handleHandleMouseEnter = () => {
    setIsHandleHovered(true);
  };

  const handleHandleMouseLeave = () => {
    setIsHandleHovered(false);
  };
  
  // const getNodeStyle = () => {
  //   return {
  //     position: 'absolute',
  //     left: x,
  //     top: y,
  //     width: width+2,
  //     height: height+2,
  //   }
  // }
  {/* <Handle 
    type="target" 
    position="left" 
    style={{
      left: -(8+4),
      top: ((height/2+2))/2,
      ...getHandleStyle('target')
    }}
    onClick={(e) => handleHandleClick(e, 'target')}
    onMouseEnter={handleHandleMouseEnter}
    onMouseLeave={handleHandleMouseLeave}
  /> */}
  
  {/* <Handle 
    type="source" 
    position="right" 
    style={{
      left: width+2,
      top: ((height/2+2))/2,
      ...getHandleStyle('source')
    }}
    onClick={(e) => handleHandleClick(e, 'source')}
    onMouseEnter={handleHandleMouseEnter}
    onMouseLeave={handleHandleMouseLeave}
  /> */}

  return (
    <div
      ref={taskRef}
      className={`gantt-task ${getTaskTypeClass(task.type)} ${isSelected ? 'selected' : ''}`}
      style={getTaskStyle()}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`${task.text} (${task.progress || 0}%)`}
    >
      {/* 진행률 표시 (완료된 태스크와 마일스톤, Phase 제외) */}
      {task.subType !== TaskSubType.MILESTONE && task.type !== 'phase' && task.maturity !== MaturityType.COMPLETED && (
        <div 
          className="gantt-task-progress" 
          style={getProgressStyle()}
          title={`진행률: ${task.progress || 0}%`}
        />
      )}
      
      {/* 태스크 텍스트 (마일스톤과 Phase 제외) */}
      {task.subType !== TaskSubType.MILESTONE && task.type !== 'phase' && (
        <div 
          className="gantt-task-text"
          style={{
            position: 'relative',
            zIndex: 2,
            paddingLeft: `${Math.max(4, Math.min(8, height * 0.2))}px`,
            paddingRight: `${Math.max(4, Math.min(8, height * 0.2))}px`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none'
          }}
        >
          {getTaskText()}
        </div>
      )}
      
      {/* 초안 상태 경고 표시 - 태스크바 가운데에 오렌지 느낌표 (마일스톤 제외) */}
      {task.subType !== TaskSubType.MILESTONE && shouldShowDraftWarning(task) && (
        <div
          className="gantt-task-warning"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            backgroundColor: '#ff8c00',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
          title="시작일이 지났습니다!"
        >
          !
        </div>
      )}
    </div>
  );
};

export default GanttTask; 
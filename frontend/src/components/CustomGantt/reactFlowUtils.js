import { MaturityType } from './types';
import { calculateTaskPosition } from './utils';

/**
 * 태스크를 ReactFlow 노드로 변환하는 함수
 * @param {Array} tasks - 태스크 배열
 * @param {Object} options - 변환 옵션
 * @returns {Array} ReactFlow 노드 배열
 */
export const convertTasksToNodes = (tasks) => {
  if (!tasks || tasks.length === 0) return [];

  // 위치 계산 및 노드 생성
  const resultNodes = [];

  tasks.forEach((task) => {
    resultNodes.push({
        id: task.id.toString(),
        type: 'customNode',
        position: { x: 100, y: 0 },
    });
  });

  return resultNodes;
};

/**
 * 태스크 관계를 ReactFlow 엣지로 변환하는 함수
 * @param {Array} tasks - 태스크 배열
 * @returns {Array} ReactFlow 엣지 배열
 */
export const convertTasksToEdges = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  const resultEdges = [];
  
  tasks.forEach(task => {
    if (task.parent && task.parent !== 0) {
      resultEdges.push({
        id: `edge-${task.parent}-${task.id}`,
        source: task.parent.toString(),
        target: task.id.toString(),
        type: 'smoothstep',
        style: { 
          stroke: '#1f6bd9', 
          strokeWidth: 2 
        },
        animated: false,
        label: '부모-자식'
      });
    }
  });
  
  return resultEdges;
};

/**
 * 태스크 타입에 따른 색상 반환
 * @param {string} maturity - 태스크 성숙도
 * @returns {string} 색상 코드
 */
export const getTaskColor = (maturity) => {
  switch (maturity) {
    case MaturityType.COMPLETED:
      return '#4CAF50'; // 녹색
    case MaturityType.IN_PROGRESS:
      return '#2196F3'; // 파란색
    case MaturityType.PLANNED:
      return '#FF9800'; // 주황색
    case MaturityType.DRAFT:
    default:
      return '#9E9E9E'; // 회색
  }
};

/**
 * 태스크 위치 정보를 포함한 노드 데이터 생성
 * @param {Array} tasks - 태스크 배열
 * @returns {Object} 위치 정보가 포함된 노드 데이터
 */
export const getTaskPositions = (tasks) => {
  const positions = {};
  
  tasks.forEach(task => {
    // 간트 차트에서의 실제 위치 정보 추출
    positions[task.id] = {
      startDate: task.start,
      endDate: task.end,
      duration: task.duration || 0,
      level: 0 // 계층 레벨 (나중에 계산)
    };
  });
  
  return positions;
};

/**
 * ReactFlow 노드 스타일 생성
 * @param {Object} task - 태스크 객체
 * @returns {Object} 노드 스타일
 */
export const createNodeStyle = (task) => {
  return {
    backgroundColor: getTaskColor(task.maturity),
    color: '#ffffff',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #333',
    minWidth: '180px',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: task.type === 'summary' ? 'bold' : 'normal',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };
};

/**
 * 사용자 정의 연결 엣지 생성
 * @param {string} sourceId - 시작 노드 ID
 * @param {string} targetId - 끝 노드 ID
 * @param {Object} options - 연결 옵션
 * @returns {Object} 커스텀 엣지
 */
export const createCustomEdge = (sourceId, targetId, options = {}) => {
  const {
    type = 'smoothstep',
    animated = true,
    color = '#ff4444',
    strokeWidth = 3
  } = options;

  return {
    id: `custom-edge-${sourceId}-${targetId}-${Date.now()}`,
    source: sourceId.toString(),
    target: targetId.toString(),
    type: type,
    style: { 
      stroke: color, 
      strokeWidth: strokeWidth 
    },
    animated: animated,
    label: '사용자 연결'
  };
};
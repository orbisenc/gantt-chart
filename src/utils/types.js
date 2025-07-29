/**
 * @typedef {Object} GanttTask
 * @property {number} id - 태스크 ID
 * @property {string} text - 태스크 제목
 * @property {Date} start - 시작일
 * @property {Date} end - 종료일
 * @property {number} duration - 기간 (일 단위)
 * @property {number} progress - 진행률 (0-100)
 * @property {string} price - 가격 (formatted)
 * @property {number} price_ratio - 가격 비율
 * @property {string} type - 태스크 타입 ('task' | 'milestone' | 'summary')
 * @property {number} parent - 부모 태스크 ID
 * @property {GanttTask[]} children - 자식 태스크들
 */

/**
 * @typedef {Object} GanttColumn
 * @property {string} id - 컬럼 ID
 * @property {string} header - 컬럼 헤더 텍스트
 * @property {number} width - 컬럼 너비
 * @property {boolean} resize - 크기 조정 가능 여부
 * @property {string} align - 정렬 ('left' | 'center' | 'right')
 * @property {Function} template - 렌더링 함수
 */

/**
 * @typedef {Object} GanttScale
 * @property {string} unit - 시간 단위 ('year' | 'quarter' | 'month' | 'week' | 'day')
 * @property {string} step - 단계
 * @property {string} format - 날짜 형식
 */

/**
 * @typedef {Object} GanttMarker
 * @property {Date} date - 마커 날짜
 * @property {string} text - 마커 텍스트
 * @property {string} className - CSS 클래스
 */

/**
 * @typedef {Object} GanttEditorField
 * @property {string} key - 필드 키
 * @property {string} type - 필드 타입
 * @property {string} label - 필드 라벨
 * @property {Object} config - 설정 객체
 */

export const TaskType = {
  PROJECT: 'project',
  PHASE: 'phase', 
  TASK: 'task'
};

export const TaskTypeLabels = {
  [TaskType.PROJECT]: '프로젝트',
  [TaskType.PHASE]: '단계',
  [TaskType.TASK]: '일반태스크'
};

export const TaskSubType = {
  NORMAL: 'normal',
  MILESTONE: 'milestone'
};

export const TaskSubTypeLabels = {
  [TaskSubType.NORMAL]: '일반 태스크',
  [TaskSubType.MILESTONE]: '마일스톤'
};

export const MaturityType = {
  DRAFT: 'draft',      // 작업예정
  IN_PROGRESS: 'in_progress',  // 작업중
  COMPLETED: 'completed'       // 완료
};

export const MaturityLabels = {
  [MaturityType.DRAFT]: '작업예정',
  [MaturityType.IN_PROGRESS]: '작업중',
  [MaturityType.COMPLETED]: '완료'
};

export const ZoomLevel = {
  YEAR: 'year',
  QUARTER: 'quarter',
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
};

export const DEFAULT_CELL_WIDTH = 50;
export const DEFAULT_ROW_HEIGHT = 32;
export const TIMELINE_HEADER_HEIGHT = 60; 
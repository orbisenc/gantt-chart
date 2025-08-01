import { MaturityType } from './types';

/**
 * 성숙도 변경 시 자동으로 상위/하위 태스크의 성숙도를 업데이트하는 함수
 * 마일스톤 타입의 태스크는 성숙도 변경이 가능하지만 cascade 업데이트에는 포함되지 않습니다.
 * @param {Array} tasks - 전체 태스크 배열
 * @param {number} changedTaskId - 변경된 태스크 ID
 * @param {string} newMaturity - 새로운 성숙도
 * @returns {Array} 업데이트된 태스크 배열
 */
export const updateTaskMaturityWithCascade = (tasks, changedTaskId, newMaturity) => {
  const updatedTasks = [...tasks];
  const changedTask = updatedTasks.find(t => t.id === changedTaskId);
  
  
  if (!changedTask) return updatedTasks;
  
  // 마일스톤은 성숙도 변경 가능하지만 cascade 업데이트에는 포함하지 않음
  if (changedTask.type === 'milestone') {
    // console.log("마일스톤 성숙도 변경:", changedTask, "새 성숙도:", newMaturity);
    changedTask.maturity = newMaturity;
    return updatedTasks;
  }
  
  // 변경된 태스크의 성숙도 업데이트
  changedTask.maturity = newMaturity;
  // console.log("updateTaskMaturityWithCascade", changedTask);
  // console.log("New maturity:", newMaturity);
  
  // 하위 태스크가 '작업중'으로 변경된 경우, 상위 태스크도 '작업중'으로 자동 변경
  if (newMaturity === MaturityType.IN_PROGRESS || newMaturity === MaturityType.COMPLETED) {
    updateParentToInProgress(updatedTasks, changedTask.parent);
  }
  
  // 모든 하위 태스크가 '완료'인 경우, 상위 태스크도 '완료'로 자동 변경
  if (newMaturity === MaturityType.COMPLETED) {
    updateParentIfAllChildrenCompleted(updatedTasks, changedTask.parent);
  }
  
  return updatedTasks;
};

/**
 * 상위 태스크를 '작업중'으로 업데이트하는 재귀 함수
 * 마일스톤 타입의 태스크는 성숙도 계산에서 제외됩니다.
 * @param {Array} tasks - 태스크 배열
 * @param {number} parentId - 상위 태스크 ID
 */
const updateParentToInProgress = (tasks, parentId) => {
  if (!parentId || parentId === 0) return;
  
  const parentTask = tasks.find(t => t.id === parentId);
  if (parentTask && parentTask.maturity === MaturityType.DRAFT && parentTask.type !== 'milestone') {
    parentTask.maturity = MaturityType.IN_PROGRESS;
    // 재귀적으로 상위 태스크도 업데이트
    updateParentToInProgress(tasks, parentTask.parent);
  }
};

/**
 * 모든 하위 태스크가 완료된 경우 상위 태스크를 '완료'로 업데이트하는 함수
 * 마일스톤 타입의 태스크는 성숙도 계산에서 제외됩니다.
 * @param {Array} tasks - 태스크 배열
 * @param {number} parentId - 상위 태스크 ID
 */
const updateParentIfAllChildrenCompleted = (tasks, parentId) => {
  if (!parentId || parentId === 0) return;
  
  const parentTask = tasks.find(t => t.id === parentId);
  if (!parentTask || parentTask.type === 'milestone') return;
  
  const childTasks = tasks.filter(t => t.parent === parentId && t.type !== 'milestone');
  if (childTasks.length === 0) return;
  
  // 모든 하위 태스크가 완료 상태인지 확인 (마일스톤 제외)
  const allChildrenCompleted = childTasks.every(child => child.maturity === MaturityType.COMPLETED);
  // console.log("******allChildrenCompleted", allChildrenCompleted);
  if (allChildrenCompleted) {
    parentTask.maturity = MaturityType.COMPLETED;
    // 재귀적으로 상위 태스크도 확인
    updateParentIfAllChildrenCompleted(tasks, parentTask.parent);
  }
};

/**
 * 성숙도에 따른 태스크 색상 반환
 * @param {string} maturity - 성숙도
 * @param {string} originalColor - 원래 색상
 * @param {Object} task - 태스크 객체 (지연 상태 확인용)
 * @returns {string} 적용할 색상
 */
export const getTaskColorByMaturity = (maturity, originalColor = '#3983eb', task = null) => {
  //console.log(`Getting color for task ${task?.id}: maturity=${maturity}, originalColor=${originalColor}`);
  
  // 완료 상태인 경우 무조건 검은색 반환
  if (maturity === MaturityType.COMPLETED) {
    //console.log(`Task ${task?.id} is completed, returning black color`);
    return '#000000';
  }
  
  // 지연 상태 확인 (end-date가 today-date를 지났을 때)
  if (task && isTaskOverdue(task)) {
    //console.log(`Task ${task.id} is overdue, returning red color`);
    return '#ff0000'; // 지연 상태는 빨간색
  }
  
  // 그 외의 경우는 원래 색상 사용
  //console.log(`Task ${task?.id} using original color: ${originalColor}`);
  return originalColor;
};

/**
 * 성숙도에 따른 수정 가능 여부 반환
 * @param {string} maturity - 성숙도
 * @returns {boolean} 수정 가능 여부
 */
export const isTaskEditable = (maturity) => {
  // 모든 성숙도 상태에서 수정 가능하도록 변경
  return true;
};

/**
 * 태스크가 지연 상태인지 확인 (end-date가 today-date를 지났을 때)
 * @param {Object} task - 태스크 객체
 * @returns {boolean} 지연 상태 여부
 */
export const isTaskOverdue = (task) => {
  if (!task.end) return false;
  
  const today = new Date();
  const taskEnd = new Date(task.end);
  
  // 날짜만 비교 (시간 제외)
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const taskEndDateOnly = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());
  
  return todayDateOnly.getTime() > taskEndDateOnly.getTime();
};

/**
 * 초안 상태이고 시작날짜가 오늘을 지난 태스크에 대한 경고 표시 여부
 * @param {Object} task - 태스크 객체
 * @returns {boolean} 경고 표시 여부
 */
export const shouldShowDraftWarning = (task) => {
  if (task.maturity !== MaturityType.DRAFT) return false;
  
  // Phase 타입은 경고 표시 제외
  if (task.type === 'phase') return false;
  
  const today = new Date();
  const taskStart = new Date(task.start);
  
  // 날짜만 비교 (시간 제외)
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const taskStartDateOnly = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());
  
  // 시작날짜가 오늘을 지났을 때 경고 표시
  return todayDateOnly.getTime() > taskStartDateOnly.getTime();
};

/**
 * 성숙도 변경 가능 여부 검증
 * @param {string} currentMaturity - 현재 성숙도
 * @param {string} newMaturity - 새로운 성숙도
 * @returns {boolean} 변경 가능 여부
 */
export const canChangeMaturity = (currentMaturity, newMaturity) => {
  // 모든 성숙도 상태에서 변경 가능하도록 수정
  return true;
};

/**
 * 초기 렌더링 시 하위 태스크들의 상태를 확인하고 상위 태스크들을 업데이트하는 함수
 * 마일스톤 타입의 태스크는 성숙도 cascade 업데이트에서 제외됩니다.
 * @param {Array} tasks - 전체 태스크 배열
 * @returns {Array} 업데이트된 태스크 배열
 */
export const initializeTaskMaturityCascade = (tasks) => {
  if (!tasks || tasks.length === 0) return tasks;
  
  // console.log("=== 초기 성숙도 Cascade 업데이트 시작 ===");
  
  const updatedTasks = [...tasks];
  let hasChanges = false;
  
  // 모든 태스크를 순회하면서 작업중이거나 완료된 하위 태스크를 찾아 상위 태스크 업데이트 (마일스톤 제외)
  updatedTasks.forEach(task => {
    if ((task.maturity === MaturityType.IN_PROGRESS || task.maturity === MaturityType.COMPLETED) && task.type !== 'milestone') {
      // console.log(`태스크 ${task.id} (${task.text})가 ${task.maturity} 상태입니다. 상위 태스크들을 업데이트합니다.`);
      
      // 상위 태스크들을 작업중으로 업데이트
      if (task.maturity === MaturityType.IN_PROGRESS || task.maturity === MaturityType.COMPLETED) {
        updateParentToInProgress(updatedTasks, task.parent);
        hasChanges = true;
      }
      
      // 완료된 경우 모든 하위 태스크가 완료되었는지 확인
      if (task.maturity === MaturityType.COMPLETED) {
        updateParentIfAllChildrenCompleted(updatedTasks, task.parent);
        hasChanges = true;
      }
    }
  });
  
  if (hasChanges) {
    // console.log("=== 초기 성숙도 Cascade 업데이트 완료 ===");
    // console.log("업데이트된 태스크들:", updatedTasks.filter(t => t.maturity === MaturityType.IN_PROGRESS || t.maturity === MaturityType.COMPLETED));
  } else {
    // console.log("=== 초기 성숙도 Cascade 업데이트: 변경사항 없음 ===");
  }
  
  return updatedTasks;
}; 
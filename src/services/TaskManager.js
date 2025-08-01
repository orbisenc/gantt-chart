import { MaturityType, TaskType, TaskSubType } from '../utils/types';
import { validateGeneralTaskDateOverlap, calculateProjectAndPhaseValues, canAddChildTask } from '../utils/utils';
import { updateTaskMaturityWithCascade, isTaskOverdue } from '../utils/maturityUtils';
import { 
  loadTasksFromLocal, 
  saveTasksToLocal, 
  clearLocalTasks 
} from '../utils/localStorage';

/**
 * TaskManager - 태스크 관리를 위한 서비스 클래스
 * 
 * 이 클래스는 태스크의 CRUD 작업, 유효성 검사, 계층 구조 관리,
 * 로컬 스토리지 연동 등의 모든 태스크 관련 비즈니스 로직을 캡슐화합니다.
 */
export class TaskManager {
  constructor(initialTasks = [], options = {}) {
    this.tasks = [...initialTasks];
    this.options = {
      useLocalStorage: true,
      autoSave: true,
      validateDates: true,
      ...options
    };
    
    // 태스크 변경 이벤트 리스너들
    this.listeners = {
      taskCreated: [],
      taskUpdated: [],
      taskDeleted: [],
      tasksChanged: []
    };
  }

  // ======================= 이벤트 관리 =======================
  
  /**
   * 이벤트 리스너 등록
   */
  addEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * 이벤트 리스너 해제
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * 이벤트 발생
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // ======================= 기본 CRUD 작업 =======================

  /**
   * 모든 태스크 조회
   */
  getAllTasks() {
    return [...this.tasks];
  }

  /**
   * ID로 태스크 조회
   */
  getTaskById(id) {
    return this.tasks.find(task => task.id === id);
  }

  /**
   * 태스크 생성
   */
  createTask(taskData) {
    // 기본값 설정
    const newTask = {
      id: this.generateNewId(),
      text: '',
      start: new Date(),
      end: new Date(),
      duration: 1,
      progress: 0,
      price: '',
      assignee: '',
      price_ratio: 0,
      type: TaskType.TASK,
      subType: TaskSubType.NORMAL,
      maturity: MaturityType.DRAFT,
      parent: 0,
      ...taskData
    };

    // 유효성 검사
    const validation = this.validateTask(newTask);
    if (!validation.isValid) {
      throw new Error(`태스크 생성 실패: ${validation.errors.join(', ')}`);
    }

    // 태스크 추가
    this.tasks.push(newTask);
    
    // 자동 저장
    if (this.options.autoSave) {
      this.saveToStorage();
    }

    // 이벤트 발생
    this.emit('taskCreated', newTask);
    this.emit('tasksChanged', this.tasks);

    return newTask;
  }

  /**
   * 태스크 업데이트
   */
  updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`태스크를 찾을 수 없습니다: ${taskId}`);
    }

    const originalTask = this.tasks[taskIndex];
    const updatedTask = { ...originalTask, ...updates };

    // 유효성 검사
    const validation = this.validateTask(updatedTask, originalTask);
    if (!validation.isValid) {
      throw new Error(`태스크 업데이트 실패: ${validation.errors.join(', ')}`);
    }

    // 기간 재계산
    this.recalculateDuration(updatedTask);

    // 태스크 업데이트
    this.tasks[taskIndex] = updatedTask;

    // 계층 구조 값 재계산 (프로젝트, Phase)
    this.recalculateHierarchyValues();

    // 성숙도 연쇄 업데이트
    this.updateMaturityCascade(updatedTask);

    // 자동 저장
    if (this.options.autoSave) {
      this.saveToStorage();
    }

    // 이벤트 발생
    this.emit('taskUpdated', { original: originalTask, updated: updatedTask });
    this.emit('tasksChanged', this.tasks);

    return updatedTask;
  }

  /**
   * 태스크 삭제
   */
  deleteTask(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) {
      throw new Error(`태스크를 찾을 수 없습니다: ${taskId}`);
    }

    // 하위 태스크들도 함께 삭제
    const allIdsToDelete = this.getAllDescendantIds(taskId);
    allIdsToDelete.push(taskId);

    // 삭제 실행
    const deletedTasks = [];
    allIdsToDelete.forEach(id => {
      const index = this.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        deletedTasks.push(this.tasks.splice(index, 1)[0]);
      }
    });

    // 계층 구조 값 재계산
    this.recalculateHierarchyValues();

    // 자동 저장
    if (this.options.autoSave) {
      this.saveToStorage();
    }

    // 이벤트 발생
    this.emit('taskDeleted', { deletedTasks, mainTaskId: taskId });
    this.emit('tasksChanged', this.tasks);

    return deletedTasks;
  }

  // ======================= 계층 구조 관리 =======================

  /**
   * 부모 태스크 조회
   */
  getParent(taskId) {
    const task = this.getTaskById(taskId);
    if (!task || task.parent === 0) return null;
    return this.getTaskById(task.parent);
  }

  /**
   * 자식 태스크들 조회
   */
  getChildren(taskId) {
    return this.tasks.filter(task => task.parent === taskId);
  }

  /**
   * 형제 태스크들 조회
   */
  getSiblings(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) return [];
    return this.tasks.filter(t => t.parent === task.parent && t.id !== taskId);
  }

  /**
   * 모든 후손 태스크 ID 조회
   */
  getAllDescendantIds(taskId) {
    const descendants = [];
    const children = this.getChildren(taskId);
    
    children.forEach(child => {
      descendants.push(child.id);
      descendants.push(...this.getAllDescendantIds(child.id));
    });
    
    return descendants;
  }

  /**
   * 태스크 이동 (부모 변경)
   */
  moveTask(taskId, newParentId) {
    const task = this.getTaskById(taskId);
    if (!task) {
      throw new Error(`태스크를 찾을 수 없습니다: ${taskId}`);
    }

    const newParent = newParentId === 0 ? null : this.getTaskById(newParentId);
    
    // 계층 구조 규칙 검사
    if (!this.validateHierarchyRules(newParent, task.type, task.subType)) {
      throw new Error('계층 구조 규칙에 위배됩니다.');
    }

    // 순환 참조 검사
    if (this.wouldCreateCircularReference(taskId, newParentId)) {
      throw new Error('순환 참조가 발생합니다.');
    }

    return this.updateTask(taskId, { parent: newParentId });
  }

  /**
   * 순환 참조 검사
   */
  wouldCreateCircularReference(taskId, newParentId) {
    if (newParentId === 0) return false;
    
    let currentParentId = newParentId;
    while (currentParentId !== 0) {
      if (currentParentId === taskId) return true;
      const parent = this.getTaskById(currentParentId);
      currentParentId = parent ? parent.parent : 0;
    }
    return false;
  }

  // ======================= 유효성 검사 =======================

  /**
   * 태스크 유효성 검사
   */
  validateTask(task, originalTask = null) {
    const errors = [];

    // 기본 필드 검사
    if (!task.text?.trim()) {
      errors.push('작업명은 필수입니다.');
    }

    if (!task.start || !task.end) {
      errors.push('시작일과 종료일은 필수입니다.');
    }

    if (task.start && task.end && task.start > task.end) {
      errors.push('종료일은 시작일보다 늦어야 합니다.');
    }

    // 계층 구조 규칙 검사
    if (task.parent !== 0) {
      const parent = this.getTaskById(task.parent);
      if (!canAddChildTask(parent, task.type, task.subType)) {
        errors.push('계층 구조 규칙에 위배됩니다.');
      }
    }

    // 날짜 겹침 검사 (일반태스크만)
    if (this.options.validateDates && 
        task.type === TaskType.TASK && 
        task.subType === TaskSubType.NORMAL) {
      
      const otherTasks = this.tasks.filter(t => t.id !== task.id);
      const validation = validateGeneralTaskDateOverlap(task, otherTasks);
      
      if (validation.hasOverlap) {
        errors.push(`날짜가 겹치는 태스크가 있습니다: ${validation.conflictingTask.text}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ======================= 계산 및 업데이트 =======================

  /**
   * 기간 재계산
   */
  recalculateDuration(task) {
    if (task.start && task.end) {
      const startDate = new Date(task.start);
      const endDate = new Date(task.end);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      task.duration = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }
  }

  /**
   * 계층 구조 값 재계산
   */
  recalculateHierarchyValues() {
    this.tasks = calculateProjectAndPhaseValues(this.tasks);
  }

  /**
   * 성숙도 연쇄 업데이트
   */
  updateMaturityCascade(task) {
    this.tasks = updateTaskMaturityWithCascade(this.tasks, task);
  }

  /**
   * 지연된 태스크 업데이트
   */
  updateOverdueTasks() {
    let hasChanges = false;
    
    this.tasks.forEach(task => {
      if (task.maturity !== MaturityType.COMPLETED && isTaskOverdue(task)) {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.emit('tasksChanged', this.tasks);
    }
  }

  // ======================= 스토리지 관리 =======================

  /**
   * 로컬 스토리지에서 로드
   */
  loadFromStorage() {
    if (!this.options.useLocalStorage) return false;
    
    const loadedTasks = loadTasksFromLocal();
    if (loadedTasks && loadedTasks.length > 0) {
      this.tasks = loadedTasks;
      this.emit('tasksChanged', this.tasks);
      return true;
    }
    return false;
  }

  /**
   * 로컬 스토리지에 저장
   */
  saveToStorage() {
    if (this.options.useLocalStorage) {
      saveTasksToLocal(this.tasks);
    }
  }

  /**
   * 로컬 스토리지 클리어
   */
  clearStorage() {
    if (this.options.useLocalStorage) {
      clearLocalTasks();
    }
  }

  // ======================= 유틸리티 =======================

  /**
   * 새 ID 생성
   */
  generateNewId() {
    const maxId = Math.max(0, ...this.tasks.map(task => task.id));
    return maxId + 1;
  }

  /**
   * 태스크 설정 업데이트
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 태스크 복제
   */
  cloneTask(taskId, newParentId = null) {
    const originalTask = this.getTaskById(taskId);
    if (!originalTask) {
      throw new Error(`태스크를 찾을 수 없습니다: ${taskId}`);
    }

    const clonedTask = {
      ...originalTask,
      id: this.generateNewId(),
      text: `${originalTask.text} (복사본)`,
      parent: newParentId !== null ? newParentId : originalTask.parent
    };

    return this.createTask(clonedTask);
  }

  /**
   * 태스크 통계 조회
   */
  getStatistics() {
    const stats = {
      total: this.tasks.length,
      byType: {},
      byMaturity: {},
      completed: 0,
      overdue: 0
    };

    this.tasks.forEach(task => {
      // 타입별 통계
      stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
      
      // 성숙도별 통계
      stats.byMaturity[task.maturity] = (stats.byMaturity[task.maturity] || 0) + 1;
      
      // 완료 통계
      if (task.maturity === MaturityType.COMPLETED) {
        stats.completed++;
      }
      
      // 지연 통계
      if (isTaskOverdue(task)) {
        stats.overdue++;
      }
    });

    return stats;
  }
}

export default TaskManager;
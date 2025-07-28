/**
 * Local Storage utility functions for task management
 */

const STORAGE_KEYS = {
  TASKS: 'gantt_tasks',
  SETTINGS: 'gantt_settings',
  BACKUP: 'gantt_tasks_backup'
};

/**
 * Task 객체를 저장 가능한 형태로 직렬화
 * Date 객체를 ISO 문자열로 변환
 */
const serializeTasks = (tasks) => {
  return tasks.map(task => ({
    ...task,
    start: task.start instanceof Date ? task.start.toISOString() : task.start,
    end: task.end instanceof Date ? task.end.toISOString() : task.end,
  }));
};

/**
 * 저장된 task 데이터를 실제 사용 가능한 형태로 역직렬화
 * ISO 문자열을 Date 객체로 변환
 */
const deserializeTasks = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  
  return tasks.map(task => ({
    ...task,
    start: typeof task.start === 'string' ? new Date(task.start) : task.start,
    end: typeof task.end === 'string' ? new Date(task.end) : task.end,
  }));
};

/**
 * 로컬 스토리지에서 태스크 배열 불러오기
 */
export const loadTasksFromLocal = () => {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!storedTasks) {
      // console.log('No tasks found in localStorage');
      return null;
    }
    
    const parsedTasks = JSON.parse(storedTasks);
    const deserializedTasks = deserializeTasks(parsedTasks);
    
    // console.log(`Loaded ${deserializedTasks.length} tasks from localStorage`);
    return deserializedTasks;
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    return null;
  }
};

/**
 * 태스크 배열을 로컬 스토리지에 저장
 */
export const saveTasksToLocal = (tasks) => {
  try {
    if (!Array.isArray(tasks)) {
      console.error('Invalid tasks data - must be an array');
      return false;
    }
    
    // 백업 생성 (이전 데이터를 백업으로 저장)
    const existingTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (existingTasks) {
      localStorage.setItem(STORAGE_KEYS.BACKUP, existingTasks);
    }
    
    const serializedTasks = serializeTasks(tasks);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(serializedTasks));
    
    // console.log(`Saved ${tasks.length} tasks to localStorage`);
    return true;
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
    return false;
  }
};

/**
 * 백업된 태스크 데이터 복원
 */
export const restoreTasksFromBackup = () => {
  try {
    const backupTasks = localStorage.getItem(STORAGE_KEYS.BACKUP);
    if (!backupTasks) {
      // console.log('No backup found');
      return null;
    }
    
    const parsedTasks = JSON.parse(backupTasks);
    const deserializedTasks = deserializeTasks(parsedTasks);
    
    // console.log(`Restored ${deserializedTasks.length} tasks from backup`);
    return deserializedTasks;
  } catch (error) {
    console.error('Error restoring tasks from backup:', error);
    return null;
  }
};

/**
 * 특정 태스크 업데이트 (전체 배열을 다시 저장하지 않고 효율적으로)
 */
export const updateTaskInLocal = (taskId, updatedTask) => {
  try {
    const tasks = loadTasksFromLocal();
    if (!tasks) {
      console.error('No tasks found to update');
      return false;
    }
    
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updatedTask } : task
    );
    
    return saveTasksToLocal(updatedTasks);
  } catch (error) {
    console.error('Error updating task in localStorage:', error);
    return false;
  }
};

/**
 * 특정 태스크 삭제
 */
export const deleteTaskFromLocal = (taskId) => {
  try {
    const tasks = loadTasksFromLocal();
    if (!tasks) {
      console.error('No tasks found to delete from');
      return false;
    }
    
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    return saveTasksToLocal(filteredTasks);
  } catch (error) {
    console.error('Error deleting task from localStorage:', error);
    return false;
  }
};

/**
 * 새 태스크 추가
 */
export const addTaskToLocal = (newTask) => {
  try {
    const tasks = loadTasksFromLocal() || [];
    const updatedTasks = [...tasks, newTask];
    
    return saveTasksToLocal(updatedTasks);
  } catch (error) {
    console.error('Error adding task to localStorage:', error);
    return false;
  }
};

/**
 * 로컬 스토리지 초기화
 */
export const clearLocalTasks = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.BACKUP);
    // console.log('Local tasks cleared');
    return true;
  } catch (error) {
    console.error('Error clearing local tasks:', error);
    return false;
  }
};

/**
 * 로컬 스토리지 상태 정보
 */
export const getLocalStorageInfo = () => {
  try {
    const tasks = loadTasksFromLocal();
    const backup = restoreTasksFromBackup();
    
    return {
      tasksCount: tasks ? tasks.length : 0,
      backupCount: backup ? backup.length : 0,
      lastModified: localStorage.getItem(STORAGE_KEYS.TASKS) ? 
        new Date(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS))[0]?.lastModified || Date.now()) : 
        null,
      storageSize: new Blob([localStorage.getItem(STORAGE_KEYS.TASKS) || '']).size
    };
  } catch (error) {
    console.error('Error getting localStorage info:', error);
    return null;
  }
};

/**
 * 태스크 데이터를 JSON 파일로 내보내기
 */
export const exportTasksToFile = (tasks, filename = 'gantt_tasks.json') => {
  try {
    const serializedTasks = serializeTasks(tasks);
    const dataStr = JSON.stringify(serializedTasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // console.log(`Exported ${tasks.length} tasks to ${filename}`);
    return true;
  } catch (error) {
    console.error('Error exporting tasks:', error);
    return false;
  }
};

/**
 * JSON 파일에서 태스크 데이터 가져오기
 */
export const importTasksFromFile = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedTasks = JSON.parse(e.target.result);
          const deserializedTasks = deserializeTasks(importedTasks);
          // console.log(`Imported ${deserializedTasks.length} tasks from file`);
          resolve(deserializedTasks);
        } catch (parseError) {
          console.error('Error parsing imported file:', parseError);
          reject(parseError);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing tasks from file:', error);
      reject(error);
    }
  });
};

export default {
  loadTasksFromLocal,
  saveTasksToLocal,
  restoreTasksFromBackup,
  updateTaskInLocal,
  deleteTaskFromLocal,
  addTaskToLocal,
  clearLocalTasks,
  getLocalStorageInfo,
  exportTasksToFile,
  importTasksFromFile
};
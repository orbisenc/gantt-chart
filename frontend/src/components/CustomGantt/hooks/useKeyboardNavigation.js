import { useEffect, useCallback } from 'react';

export const useKeyboardNavigation = ({
  tasks,
  selectedTask,
  onTaskSelect,
  onTaskEdit,
  onTaskDelete,
  onTaskAdd
}) => {
  const handleKeyDown = useCallback((e) => {
    if (!selectedTask) return;

    const currentIndex = tasks.findIndex(task => task.id === selectedTask.id);
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          onTaskSelect(tasks[currentIndex - 1]);
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < tasks.length - 1) {
          onTaskSelect(tasks[currentIndex + 1]);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        onTaskEdit(selectedTask);
        break;
        
      case 'Delete':
        e.preventDefault();
        if (window.confirm('선택한 태스크를 삭제하시겠습니까?')) {
          onTaskDelete(selectedTask.id);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        onTaskSelect(null);
        break;
        
      case 'Insert':
        e.preventDefault();
        onTaskAdd(selectedTask.id);
        break;
        
      case 'Home':
        e.preventDefault();
        if (tasks.length > 0) {
          onTaskSelect(tasks[0]);
        }
        break;
        
      case 'End':
        e.preventDefault();
        if (tasks.length > 0) {
          onTaskSelect(tasks[tasks.length - 1]);
        }
        break;
        
      default:
        break;
    }
  }, [tasks, selectedTask, onTaskSelect, onTaskEdit, onTaskDelete, onTaskAdd]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { handleKeyDown };
};

export default useKeyboardNavigation; 
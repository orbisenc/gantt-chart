import React, { useEffect, useRef } from 'react';
import { canAddChildTask } from './utils';

const ContextMenu = ({ 
  isOpen, 
  position, 
  onClose, 
  onEdit, 
  onDelete, 
  onAddChild, 
  onAddSibling,
  task 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    {
      label: '편집',
      icon: '✏️',
      action: () => {
        onEdit(task);
        onClose();
      }
    },
    // 하위 태스크 추가는 project와 phase에서만 가능
    ...(canAddChildTask(task.type) ? [{
      label: '하위 태스크 추가',
      icon: '➕',
      action: () => {
        onAddChild(task.id);
        onClose();
      }
    }] : []),
    {
      label: '동일 레벨 태스크 추가',
      icon: '⚡',
      action: () => {
        onAddSibling(task.parent);
        onClose();
      }
    },
    {
      label: '삭제',
      icon: '🗑️',
      action: () => {
        onDelete(task.id);
        onClose();
      },
      className: 'danger'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        minWidth: '180px',
        padding: '4px 0'
      }}
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          className={`context-menu-item ${item.className || ''}`}
          onClick={item.action}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: item.className === 'danger' ? '#dc3545' : '#333',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = item.className === 'danger' ? '#fff5f5' : '#f8f9fa';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          <span className="context-menu-icon">{item.icon}</span>
          <span className="context-menu-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ContextMenu; 
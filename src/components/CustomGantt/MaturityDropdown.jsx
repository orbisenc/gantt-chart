import React, { useState } from 'react';
import { MaturityType, MaturityLabels } from '../../utils/types';
import { canChangeMaturity } from '../../utils/maturityUtils';

const MaturityDropdown = ({ 
  value, 
  onChange, 
  disabled = false,
  task = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (maturityValue) => {
    if (!disabled && canChangeMaturity(value, maturityValue)) {
      onChange(maturityValue);
      setIsOpen(false);
    }
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

  const currentStyle = getMaturityStyle(value);

  return (
    <div className="maturity-dropdown" style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="maturity-dropdown-button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          ...currentStyle,
          width: '100%',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span>{MaturityLabels[value] || '선택'}</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>
      
      {isOpen && !disabled && (
        <div
          className="maturity-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            marginTop: '2px'
          }}
        >
          {Object.values(MaturityType).map((maturity) => (
            <button
              key={maturity}
              type="button"
              className="maturity-dropdown-item"
              onClick={() => handleSelect(maturity)}
              style={{
                ...getMaturityStyle(maturity),
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                borderBottom: '1px solid #e9ecef',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = getMaturityStyle(maturity).backgroundColor;
              }}
            >
              {MaturityLabels[maturity]}
            </button>
          ))}
        </div>
      )}
      
      {/* 클릭 외부 영역 감지를 위한 오버레이 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MaturityDropdown; 
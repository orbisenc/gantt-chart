import React, { useState, useEffect } from 'react';
import { formatDate, formatNumberWithCommas, generateTimelineScale, isTaskFieldEditable } from '../../utils/utils';
import { MaturityType, MaturityLabels, TaskType, TaskSubType, TaskSubTypeLabels } from '../../utils/types';
import { isTaskEditable } from '../../utils/maturityUtils';

const TaskEditModal = ({ 
  task, 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  taskManager, // 태스크 관리 함수들
  allTasks = [] // 전체 태스크 배열 (관계 분석용)
}) => {
  const [formData, setFormData] = useState({
    text: '',
    start: '',
    end: '',
    progress: 0,
    price: '',
    price_ratio: 0,
    type: 'task',
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT
  });

  useEffect(() => {
    if (task) {
      setFormData({
        text: task.text || '',
        start: formatDate(task.start, 'YYYY-MM-DD') || '',
        end: formatDate(task.end, 'YYYY-MM-DD') || '',
        progress: task.progress || 0,
        price: task.price || '',
        price_ratio: task.price_ratio || 0,
        type: task.type || 'task',
        subType: task.subType || TaskSubType.NORMAL,
        maturity: task.maturity || MaturityType.DRAFT
      });
    }
  }, [task]);

  // 스냅 기능: 날짜를 가장 가까운 그리드 라인에 맞춤
  const snapToGrid = (dateString, field) => {
    if (!dateString) return dateString;
    
    const date = new Date(dateString);
    const currentYear = date.getFullYear();
    
    // 현재 연도의 타임라인 스케일 생성 (월 단위)
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    const timelineScale = generateTimelineScale(yearStart, yearEnd, 'month');
    
    // 가장 가까운 스케일 날짜 찾기
    let closestDate = timelineScale[0].date;
    let minDiff = Math.abs(date.getTime() - closestDate.getTime());
    
    for (const scale of timelineScale) {
      const scaleDate = new Date(scale.date);
      const diff = Math.abs(date.getTime() - scaleDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = scaleDate;
      }
    }
    
    // 스냅된 날짜를 YYYY-MM-DD 형식으로 반환
    return formatDate(closestDate, 'YYYY-MM-DD');
  };

  const handleChange = (field, value) => {
    let processedValue = value;
    
    // 스냅 기능 비활성화 - 사용자가 입력한 정확한 날짜 사용
    // if (field === 'start' || field === 'end') {
    //   processedValue = snapToGrid(value, field);
    // }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // console.log('TaskEditModal handleSubmit called');
    // console.log('Form data:', formData);
    // console.log('Original task:', task);
    
    // 유효성 검사
    if (!validateDates(formData.start, formData.end)) {
      alert('종료일은 시작일보다 늦어야 합니다.');
      return;
    }
    
    if (!validatePrice(formData.price)) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }
    
    // 완료된 태스크인 경우 성숙도만 변경 가능
    if (isCompleted) {
      const updatedTask = {
        ...task,
        maturity: formData.maturity
      };
      // console.log('Completed task update:', updatedTask);
      onSave(updatedTask);
      onClose();
      return;
    }
    
    const updatedTask = {
      ...task,
      text: formData.text,
      start: new Date(formData.start),
      end: new Date(formData.end),
      progress: isMilestone ? 0 : parseInt(formData.progress),
      price: isMilestone ? 0 : formData.price,
      price_ratio: isMilestone ? 0 : parseFloat(formData.price_ratio),
      type: formData.type,
      subType: formData.subType, // 서브타입도 저장
      maturity: formData.maturity
    };

    // 기간 재계산 - 정확한 날짜 차이 계산
    const startDate = new Date(formData.start);
    const endDate = new Date(formData.end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const duration = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
    updatedTask.duration = duration;

    // console.log('Updated task before save:', updatedTask);
    // console.log('Start date:', updatedTask.start);
    // console.log('End date:', updatedTask.end);
    // console.log('Duration:', updatedTask.duration);
    // console.log('onSave function exists:', typeof onSave === 'function');
    
    onSave(updatedTask);
    onClose();
  };

  const handleDelete = () => {
    // taskManager를 사용하여 하위 태스크 정보 제공
    let confirmMessage = '정말로 이 태스크를 삭제하시겠습니까?';
    
    if (taskManager) {
      const children = taskManager.getChildren(task.id);
      if (children.length > 0) {
        confirmMessage = `이 태스크와 ${children.length}개의 하위 태스크가 모두 삭제됩니다. 계속하시겠습니까?`;
      }
    }
    
    if (window.confirm(confirmMessage)) {
      onDelete(task.id);
      onClose();
    }
  };

  // 성숙도별 배경색 반환
  const getMaturityBackgroundColor = (maturity) => {
    switch (maturity) {
      case MaturityType.DRAFT:
        return '#fff3cd';
      case MaturityType.IN_PROGRESS:
        return '#d4edda';
      case MaturityType.COMPLETED:
        return '#f8f9fa';
      default:
        return '#fff';
    }
  };

  // 성숙도별 텍스트 색상 반환
  const getMaturityTextColor = (maturity) => {
    switch (maturity) {
      case MaturityType.DRAFT:
        return '#856404';
      case MaturityType.IN_PROGRESS:
        return '#155724';
      case MaturityType.COMPLETED:
        return '#495057';
      default:
        return '#495057';
    }
  };

  // 태스크 관계 정보 계산
  const getTaskRelationshipInfo = () => {
    if (!taskManager || !task) return { parent: null, children: [], siblings: [] };
    
    const parent = taskManager.getParent(task.id);
    const children = taskManager.getChildren(task.id);
    const siblings = parent ? taskManager.getChildren(parent.id).filter(t => t.id !== task.id) : [];
    
    return { parent, children, siblings };
  };

  // 가격 유효성 검사
  const validatePrice = (priceString) => {
    if (!priceString) return true;
    const numericValue = priceString.replace(/,/g, '');
    return !isNaN(numericValue) && parseFloat(numericValue) >= 0;
  };

  // 날짜 유효성 검사
  const validateDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  if (!isOpen || !task) return null;

  // 완료된 태스크인지 확인 (실시간으로 업데이트)
  const isCompleted = formData.maturity === MaturityType.COMPLETED;
  
  // 마일스톤인지 확인
  const isMilestone = formData.type === 'milestone';
  
  // 필드별 편집 가능 여부 체크
  const isFieldEditable = (field) => {
    if (isCompleted) return false;
    return isTaskFieldEditable(formData.type, field, formData.subType);
  };

  // 태스크 관계 정보
  const relationshipInfo = getTaskRelationshipInfo();

  return (
    <div className="task-edit-modal-overlay" style={overlayStyle}>
      <div className="task-edit-modal" style={modalStyle}>
        <div className="modal-header" style={headerStyle}>
          <h3 style={{ margin: 0, color: '#333' }}>태스크 편집</h3>
          <button 
            onClick={onClose}
            style={closeButtonStyle}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>
        
        {/* 완료된 태스크인 경우 안내 메시지 */}
        {isCompleted && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
            padding: '10px 20px',
            margin: '0 20px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ⚠️ 완료된 태스크는 성숙도만 수정할 수 있습니다.
          </div>
        )}
        
        {/* 프로젝트인 경우 안내 메시지 */}
        {formData.type === TaskType.PROJECT && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
            padding: '10px 20px',
            margin: '0 20px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            🏗️ 프로젝트는 하위 태스크를 기준으로 모든 값이 자동 계산됩니다.
          </div>
        )}
        
        {/* 단계인 경우 안내 메시지 */}
        {formData.type === TaskType.PHASE && (
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #bbdefb',
            color: '#1565c0',
            padding: '10px 20px',
            margin: '0 20px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📋 단계는 하위 태스크를 기준으로 날짜/진척도/성숙도가 자동 계산됩니다. 작업명만 수정 가능합니다.
          </div>
        )}
        
        {/* 마일스톤인 경우 안내 메시지 */}
        {formData.type === TaskType.TASK && formData.subType === TaskSubType.MILESTONE && (
          <div style={{
            backgroundColor: '#fce4ec',
            border: '1px solid #f8bbd9',
            color: '#ad1457',
            padding: '10px 20px',
            margin: '0 20px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📍 마일스톤은 날짜만 설정 가능하며, 진척도/성숙도/예산/보할은 수정할 수 없습니다.
          </div>
        )}
        
        {/* 태스크 관계 정보 */}
        {taskManager && (relationshipInfo.parent || relationshipInfo.children.length > 0) && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            color: '#495057',
            padding: '10px 20px',
            margin: '0 20px',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <strong>📋 태스크 관계</strong>
            {relationshipInfo.parent && (
              <div>• 상위 태스크: {relationshipInfo.parent.text}</div>
            )}
            {relationshipInfo.children.length > 0 && (
              <div>• 하위 태스크 {relationshipInfo.children.length}개: {relationshipInfo.children.map(c => c.text).join(', ')}</div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={formStyle}>
          <div className="form-group" style={formGroupStyle}>
            <label style={labelStyle}>작업명</label>
            <input
              type="text"
              value={formData.text}
              onChange={(e) => handleChange('text', e.target.value)}
              style={{
                ...inputStyle,
                backgroundColor: !isFieldEditable('text') ? '#f8f9fa' : inputStyle.backgroundColor,
                color: !isFieldEditable('text') ? '#6c757d' : inputStyle.color,
                cursor: !isFieldEditable('text') ? 'not-allowed' : inputStyle.cursor
              }}
              disabled={!isFieldEditable('text')}
              required
            />
          </div>

          <div className="form-row" style={formRowStyle}>
            <div className="form-group" style={formGroupStyle}>
              <label style={labelStyle}>시작일</label>
              <input
                type="date"
                value={formData.start}
                onChange={(e) => handleChange('start', e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: !isFieldEditable('start') ? '#f8f9fa' : inputStyle.backgroundColor,
                  color: !isFieldEditable('start') ? '#6c757d' : inputStyle.color,
                  cursor: !isFieldEditable('start') ? 'not-allowed' : inputStyle.cursor
                }}
                disabled={!isFieldEditable('start')}
                required
              />
              <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                원하는 날짜를 정확히 입력하세요
              </small>
            </div>
            <div className="form-group" style={formGroupStyle}>
              <label style={labelStyle}>종료일</label>
              <input
                type="date"
                value={formData.end}
                onChange={(e) => handleChange('end', e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: !isFieldEditable('end') ? '#f8f9fa' : inputStyle.backgroundColor,
                  color: !isFieldEditable('end') ? '#6c757d' : inputStyle.color,
                  cursor: !isFieldEditable('end') ? 'not-allowed' : inputStyle.cursor
                }}
                disabled={!isFieldEditable('end')}
                required
              />
              <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                원하는 날짜를 정확히 입력하세요
              </small>
            </div>
          </div>

          <div className="form-row" style={formRowStyle}>
            <div className="form-group" style={formGroupStyle}>
              <label style={labelStyle}>진행률 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => handleChange('progress', e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: !isFieldEditable('progress') ? '#f8f9fa' : inputStyle.backgroundColor,
                  color: !isFieldEditable('progress') ? '#6c757d' : inputStyle.color,
                  cursor: !isFieldEditable('progress') ? 'not-allowed' : inputStyle.cursor
                }}
                disabled={!isFieldEditable('progress')}
              />
            </div>
            <div className="form-group" style={formGroupStyle}>
              <label style={labelStyle}>타입</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                style={{
                  ...selectStyle,
                  backgroundColor: !isFieldEditable('type') ? '#f8f9fa' : selectStyle.backgroundColor,
                  color: !isFieldEditable('type') ? '#6c757d' : selectStyle.color,
                  cursor: !isFieldEditable('type') ? 'not-allowed' : selectStyle.cursor
                }}
                disabled={!isFieldEditable('type')}
              >
                <option value="task">태스크</option>
                <option value="phase">단계</option>
                <option value="project">프로젝트</option>
              </select>
            </div>
            {/* 서브타입 필드 - task 타입일 때만 표시 */}
            {formData.type === TaskType.TASK && (
              <div className="form-group" style={formGroupStyle}>
                <label style={labelStyle}>상세 타입</label>
                <select
                  value={formData.subType}
                  onChange={(e) => handleChange('subType', e.target.value)}
                  style={{
                    ...selectStyle,
                    backgroundColor: !isFieldEditable('subType') ? '#f8f9fa' : selectStyle.backgroundColor,
                    color: !isFieldEditable('subType') ? '#6c757d' : selectStyle.color,
                    cursor: !isFieldEditable('subType') ? 'not-allowed' : selectStyle.cursor
                  }}
                  disabled={!isFieldEditable('subType')}
                >
                  <option value={TaskSubType.NORMAL}>{TaskSubTypeLabels[TaskSubType.NORMAL]}</option>
                  <option value={TaskSubType.MILESTONE}>{TaskSubTypeLabels[TaskSubType.MILESTONE]}</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label style={labelStyle}>성숙도 (작업상태)</label>
            <select
              value={formData.maturity}
              onChange={(e) => handleChange('maturity', e.target.value)}
              style={{
                ...selectStyle,
                backgroundColor: !isFieldEditable('maturity') ? '#f8f9fa' : getMaturityBackgroundColor(formData.maturity),
                color: !isFieldEditable('maturity') ? '#6c757d' : getMaturityTextColor(formData.maturity),
                cursor: !isFieldEditable('maturity') ? 'not-allowed' : selectStyle.cursor
              }}
              disabled={!isFieldEditable('maturity')}
            >
              {Object.values(MaturityType).map((maturity) => (
                <option key={maturity} value={maturity}>
                  {MaturityLabels[maturity]}
                </option>
              ))}
            </select>
            <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
              {formData.type === TaskType.PROJECT ? '프로젝트의 성숙도는 하위 태스크들의 평균값으로 자동 계산됩니다.' :
               formData.type === TaskType.PHASE ? '단계의 성숙도는 하위 태스크들의 평균값으로 자동 계산됩니다.' :
               formData.subType === TaskSubType.MILESTONE ? '마일스톤의 성숙도는 수정할 수 없습니다.' :
               isCompleted ? '완료된 태스크는 성숙도만 변경할 수 있습니다.' : 
               '태스크의 성숙도는 직접 변경할 수 있습니다.'}
            </small>
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label style={labelStyle}>예산</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              style={{
                ...inputStyle,
                backgroundColor: !isFieldEditable('price') ? '#f8f9fa' : inputStyle.backgroundColor,
                color: !isFieldEditable('price') ? '#6c757d' : inputStyle.color,
                cursor: !isFieldEditable('price') ? 'not-allowed' : inputStyle.cursor
              }}
              disabled={!isFieldEditable('price')}
              placeholder="예: 1,000,000"
            />
          </div>

          <div className="form-group" style={formGroupStyle}>
            <label style={labelStyle}>보할 (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.price_ratio}
              onChange={(e) => handleChange('price_ratio', e.target.value)}
              style={{
                ...inputStyle,
                backgroundColor: !isFieldEditable('price_ratio') ? '#f8f9fa' : inputStyle.backgroundColor,
                color: !isFieldEditable('price_ratio') ? '#6c757d' : inputStyle.color,
                cursor: !isFieldEditable('price_ratio') ? 'not-allowed' : inputStyle.cursor
              }}
              disabled={!isFieldEditable('price_ratio')}
            />
          </div>

          <div className="form-actions" style={actionsStyle}>
            <button
              type="button"
              onClick={handleDelete}
              style={deleteButtonStyle}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
            >
              삭제
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={cancelButtonStyle}
                onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                취소
              </button>
              <button
                type="submit"
                style={saveButtonStyle}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// 스타일 정의
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  width: '500px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 20px 0 20px',
  borderBottom: '1px solid #eee',
  paddingBottom: '15px'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  padding: '5px',
  borderRadius: '4px',
  color: '#666'
};

const formStyle = {
  padding: '20px'
};

const formGroupStyle = {
  marginBottom: '15px'
};

const formRowStyle = {
  display: 'flex',
  gap: '15px'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: '600',
  color: '#333',
  fontSize: '14px'
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer'
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '25px',
  paddingTop: '15px',
  borderTop: '1px solid #eee'
};

const deleteButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

const cancelButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

const saveButtonStyle = {
  padding: '8px 16px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500'
};

export default TaskEditModal; 
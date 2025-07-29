import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { formatDate, generateUpperScales } from '../../utils/utils';

const GanttTimeline = forwardRef(({ 
  scale = [], 
  cellWidth = 100, 
  rowHeight = 32,
  markers = [], 
  scrollLeft = 0,
  zoomLevel,
  onScroll
}, ref) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (ref) {
      ref.current = containerRef.current;
    }
  }, [ref]);

  const fixedCellHeight = rowHeight; // rowHeight와 통일
  const cellGap = 2; // 셀 간격 추가

  const handleScroll = (e) => {
    const newScrollLeft = e.target.scrollLeft;
    onScroll?.(newScrollLeft);
  };


  // 상위 스케일 렌더링 함수
  const renderUpperScales = () => {
    if (scale.length === 0) return null;
    
    // 현재 줌 레벨에 따른 상위 스케일 생성
    const unit = scale[0]?.unit;
    const upperScales = generateUpperScales(scale, zoomLevel);

    // 각 레벨별로 그룹화
    const scalesByLevel = {};
    upperScales.forEach(scale => {
      if (!scalesByLevel[scale.level]) {
        scalesByLevel[scale.level] = [];
      }
      scalesByLevel[scale.level].push(scale);
    });

    // 각 레벨별로 서로 다른 div 엘레멘트 생성
    return Object.keys(scalesByLevel).map(level => {
      const levelScales = scalesByLevel[level];
      let itemCounter = 0; // 각 레벨에서 아이템 카운터

      return (
        <div
          key={`level-${level}`}
          className="gantt-timeline-upper-level"
          style={{
            position: 'absolute',
            top: level * fixedCellHeight,
            left: 0,
            width: '100%',
            height: `${fixedCellHeight}px`,
            zIndex: 5 - level
          }}
        >
          {levelScales.map((upperItem, index) => {
            // 현재 아이템의 left 위치 계산 (간격 포함)
            const leftPosition = itemCounter * (cellWidth + cellGap);
            // 다음 아이템을 위해 카운터 증가
            itemCounter += upperItem.span;

            return (
              <div
                key={`upper-${level}-${index}`}
                className="gantt-timeline-upper-scale"
                style={{
                  position: 'absolute',
                  left: leftPosition,
                  width: (cellWidth * upperItem.span) + ((upperItem.span - 1) * cellGap),
                  height: `${fixedCellHeight}px`,
                  borderRight: '2px solid #e6e6e6',
                  borderBottom: '1px solid #e6e6e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: '#f8f9fa',
                  color: '#2c2f3c'
                }}
              >
                {upperItem.label}
              </div>
            );
          })}
        </div>
      );
    });
  };

  const totalWidth = scale.length * (cellWidth + cellGap) - cellGap; // 마지막 간격 제거
  const scaleHeight = scale[0]?.subScale?.length || 0;
  
  // 상위 스케일 개수 계산
  const unit = scale[0]?.unit;
  const upperScales = generateUpperScales(scale, zoomLevel);
  const maxLevel = upperScales.length > 0 ? Math.max(...upperScales.map(s => s.level)) : 0;
  
  const timelineHeight = (maxLevel + 2) * fixedCellHeight; // 상위 스케일 + 기본 스케일

  return (
    <div 
      ref={containerRef}
      className="gantt-timeline"
      style={{ 
        overflowY: 'hidden',
        overflowX: 'hidden', // 자체 스크롤 비활성화
        height: `${timelineHeight}px`,
        width: `${totalWidth}px`, // 실제 너비 설정
        borderBottom: '1px solid #e6e6e6',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div 
        className="gantt-timeline-content"
        style={{ 
          width: `${totalWidth}px`,
          height: '100%',
          position: 'relative',
          minWidth: totalWidth
        }}
      >
        {/* 상위 스케일들 렌더링 */}
        {renderUpperScales()}

        {/* 기본 스케일 렌더링 */}
        <div
          className="gantt-timeline-base-level"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${fixedCellHeight}px`,
            zIndex: 1
          }}
        >
          {scale.map((item, index) => (
            <div
              key={index}
              className={`gantt-timeline-cell ${item.isWeekend ? 'weekend' : ''}`}
              style={{
                position: 'absolute',
                left: index * (cellWidth + cellGap),
                width: `${cellWidth}px`,
                height: `${fixedCellHeight}px`,
                borderRight: '2px solid #e6e6e6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: item.isWeekend ? '#f0f6fa' : '#f2f3f7',
                color: item.isWeekend ? '#9fa1ae' : '#2c2f3c'
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
        
        {/* 마커 렌더링 */}
        {/* {markers.map((marker, index) => {
          const markerPosition = getMarkerPosition(marker.date, scale, cellWidth + cellGap);
          if (markerPosition === null) return null;
          
          return (
            <div
              key={`marker-${index}`}
              className={`gantt-timeline-marker ${marker.className || ''}`}
              style={{
                position: 'absolute',
                left: markerPosition,
                top: 0,
                height: '100%',
                width: '2px',
                pointerEvents: 'none'
              }}
            >
              {marker.text && (
                <div className="gantt-timeline-marker-label">
                  {marker.text}
                </div>
              )}
            </div>
          );
        })} */}

        {/* 맨 오른쪽 끝 수직 라인 */}
        {/* <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#d1d5db',
            zIndex: 1
          }}
        /> */}
      </div>
    </div>
  );
});

/**
 * 마커의 위치를 계산합니다.
 * @param {Date} markerDate - 마커 날짜
 * @param {Array} scale - 타임라인 스케일
 * @param {number} cellWidth - 셀 너비
 * @returns {number|null} 마커 위치 (픽셀)
 */
const getMarkerPosition = (markerDate, scale, cellWidth) => {
  if (!markerDate || scale.length === 0) return null;
  
  const markerTime = markerDate.getTime();
  
  // 첫 번째와 마지막 날짜 찾기
  const firstDate = scale[0].date;
  const lastDate = scale[scale.length - 1].date;
  
  if (markerTime < firstDate.getTime() || markerTime > lastDate.getTime()) {
    return null;
  }
  
  // 마커가 위치할 셀 찾기
  for (let i = 0; i < scale.length; i++) {
    const currentDate = scale[i].date;
    const nextDate = i < scale.length - 1 ? scale[i + 1].date : null;
    
    if (nextDate && markerTime >= currentDate.getTime() && markerTime < nextDate.getTime()) {
      // 셀 내에서의 정확한 위치 계산
      const cellProgress = (markerTime - currentDate.getTime()) / (nextDate.getTime() - currentDate.getTime());
      return i * cellWidth + cellProgress * cellWidth;
    }
  }
  
  // 마지막 셀에 위치하는 경우
  return (scale.length - 1) * cellWidth;
};

GanttTimeline.displayName = 'GanttTimeline';

export default GanttTimeline; 
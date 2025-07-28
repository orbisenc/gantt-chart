import { TaskType, TaskSubType, MaturityType } from './types';

/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 두 날짜 사이의 일수를 계산합니다.
 * @param {Date} startDate - 시작일
 * @param {Date} endDate - 종료일
 * @returns {number} 일수
 */
export const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 시간을 00:00:00으로 정규화하여 정확한 날짜 차이 계산
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end - start;
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24))); // 최소 1일
};

/**
 * 날짜에 일수를 더합니다.
 * @param {Date} date - 기준 날짜
 * @param {number} days - 더할 일수
 * @returns {Date} 새로운 날짜
 */
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  // 시간을 00:00:00으로 정규화
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * 날짜를 문자열로 포맷팅합니다.
 * @param {Date} date - 날짜
 * @param {string} format - 포맷 ('YYYY-MM-DD' | 'MM/DD' | 'DD')
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD':
      return `${month}/${day}`;
    case 'DD':
      return day;
    case 'YYYY':
      return year.toString();
    case 'MM':
      return month;
    case 'MMM':
      return d.toLocaleDateString('ko-KR', { month: 'short' });
    case 'Q':
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      return `Q${quarter}`; //`Q${quarter}: ${quarter === 1 ? '1월~3월' : quarter === 2 ? '4월~6월' : quarter === 3 ? '7월~9월' : '10월~12월'}`;
    default:
      return d.toLocaleDateString('ko-KR');
  }
};

/**
 * 주어진 날짜가 주말인지 확인합니다.
 * @param {Date} date - 날짜
 * @returns {boolean} 주말 여부
 */
export const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
};

/**
 * 태스크 관련 유틸리티 함수들
 */

/**
 * 태스크 목록을 계층 구조로 변환합니다.
 * @param {Array} tasks - 플랫 태스크 목록
 * @returns {Array} 계층 구조 태스크 목록
 */
export const buildTaskHierarchy = (tasks) => {
  //console.log("buildTaskHierarchy called with tasks:", tasks.length);
  
  const taskMap = new Map();
  const rootTasks = [];
  
  // 모든 태스크를 맵에 저장
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });
  
  //console.log("TaskMap created with entries:", taskMap.size);
  
  // 부모-자식 관계 설정
  tasks.forEach(task => {
    const currentTask = taskMap.get(task.id);
    if (task.parent && task.parent !== 0) {
      const parentTask = taskMap.get(task.parent);
      if (parentTask) {
        parentTask.children.push(currentTask);
        //console.log(`Added task ${task.id} as child of ${task.parent}`);
      } else {
        //console.warn(`Parent task ${task.parent} not found for task ${task.id}`);
        // 부모를 찾을 수 없으면 루트 태스크로 처리
        rootTasks.push(currentTask);
      }
    } else {
      rootTasks.push(currentTask);
      //console.log(`Added task ${task.id} as root task`);
    }
  });
  
  //console.log("Root tasks:", rootTasks.length);
  //console.log("Root task IDs:", rootTasks.map(t => t.id));
  
  return rootTasks;
};

/**
 * 계층 구조를 플랫 목록으로 변환합니다.
 * @param {Array} hierarchyTasks - 계층 구조 태스크 목록
 * @returns {Array} 플랫 태스크 목록
 */
export const flattenTaskHierarchy = (hierarchyTasks) => {
  //console.log("flattenTaskHierarchy called with hierarchy tasks:", hierarchyTasks.length);
  
  const result = [];
  
  const flatten = (tasks, level = 0) => {
    tasks.forEach(task => {
      result.push({ ...task, level });
      //console.log(`Flattened task ${task.id} at level ${level}`);
      if (task.children && task.children.length > 0) {
        //console.log(`Task ${task.id} has ${task.children.length} children`);
        flatten(task.children, level + 1);
      }
    });
  };
  
  flatten(hierarchyTasks);
  //console.log("Flattened result:", result.length, "tasks");
  return result;
};

/**
 * 태스크의 위치와 크기를 계산합니다 (스냅 기능 포함).
 * @param {Object} task - 태스크 객체
 * @param {Array} timelineScale - 타임라인 스케일 배열
 * @param {number} cellWidth - 셀 너비 (고정 100px)
 * @param {number} cellGap - 셀 간격 (고정 2px)
 * @param {string} timeUnit - 시간 단위
 * @returns {Object} { x, width } 위치와 너비
 */
export const calculateTaskPosition = (task, timelineScale, cellWidth = 100, cellGap = 2, timeUnit) => {
  if (!timelineScale || timelineScale.length === 0) {
    return { x: 0, width: cellWidth };
  }
  
  const taskStart = new Date(task.start);
  const taskEnd = new Date(task.end);
  
  // 태스크 시작 위치 찾기
  let startIndex = -1;
  let endIndex = -1;
  
  for (let i = 0; i < timelineScale.length; i++) {
    const scaleDate = new Date(timelineScale[i].date);
    const nextScaleDate = i < timelineScale.length - 1 ? new Date(timelineScale[i + 1].date) : null;
    
    // 태스크 시작일이 속하는 스케일 찾기
    if (startIndex === -1) {
      if (nextScaleDate) {
        if (taskStart >= scaleDate && taskStart < nextScaleDate) {
          startIndex = i;
        }
      } else {
        // 마지막 스케일인 경우
        if (taskStart >= scaleDate) {
          startIndex = i;
        }
      }
    }
    
    // 태스크 종료일이 속하는 스케일 찾기
    if (nextScaleDate) {
      if (taskEnd > scaleDate && taskEnd <= nextScaleDate) {
        endIndex = i + 1;
      }
    } else {
      // 마지막 스케일인 경우
      if (taskEnd > scaleDate) {
        endIndex = i + 1;
      }
    }
  }
  
  // 인덱스가 유효하지 않은 경우 기본값 설정
  if (startIndex === -1) {
    // 태스크가 타임라인 범위를 벗어난 경우, 가장 가까운 위치로 조정
    if (taskStart < new Date(timelineScale[0].date)) {
      startIndex = 0;
    } else {
      startIndex = timelineScale.length - 1;
    }
  }
  if (endIndex === -1) {
    if (taskEnd > new Date(timelineScale[timelineScale.length - 1].date)) {
      endIndex = timelineScale.length;
    } else {
      endIndex = startIndex + 1;
    }
  }
  
  // 스냅 기능: 시작과 끝을 그리드 라인에 맞춤
  const startX = startIndex * (cellWidth + cellGap);
  const endX = endIndex * (cellWidth + cellGap) - cellGap;
  const width = Math.max(endX - startX, cellWidth * 0.1);
  
  return { x: startX, width };
};

/**
 * 시간 단위에 따른 밀리초 단위 기간을 반환합니다.
 * @param {string} timeUnit - 시간 단위
 * @returns {number} 밀리초 단위 기간
 */
function getScaleUnitDuration(timeUnit) {
  switch (timeUnit) {
    case 'day':
      return 24 * 60 * 60 * 1000; // 1일
    case 'week':
      return 7 * 24 * 60 * 60 * 1000; // 1주
    case 'month':
      return 30 * 24 * 60 * 60 * 1000; // 30일 (근사값)
    case 'quarter':
      return 90 * 24 * 60 * 60 * 1000; // 90일 (근사값)
    case 'year':
      return 365 * 24 * 60 * 60 * 1000; // 365일 (근사값)
    default:
      return 30 * 24 * 60 * 60 * 1000; // 기본값: 30일
  }
}

/**
 * 타임라인 스케일을 생성합니다.
 * 시작과 끝에 여분의 컬럼을 추가하여 태스크바 클리핑을 방지합니다.
 */
export function generateTimelineScale(start, end, unit) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const scale = [];
  
  // 실제 태스크 시작/끝 날짜를 기준으로 스케일 범위 결정
  let scaleStart, scaleEnd;
  
  switch (unit) {
    case 'year':
      scaleStart = new Date(startDate.getFullYear(), 0, 1);
      scaleEnd = new Date(endDate.getFullYear() + 1, 0, 1);
      break;
    case 'quarter':
      const startQuarter = Math.floor(startDate.getMonth() / 3);
      const endQuarter = Math.floor(endDate.getMonth() / 3);
      scaleStart = new Date(startDate.getFullYear(), startQuarter * 3, 1);
      scaleEnd = new Date(endDate.getFullYear(), (endQuarter + 1) * 3, 1);
      break;
    case 'month':
      scaleStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      scaleEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
      break;
    case 'week':
      // 해당 주의 시작일로 조정 (일요일 기준)
      scaleStart = new Date(startDate);
      scaleStart.setDate(startDate.getDate() - startDate.getDay());
      scaleEnd = new Date(endDate);
      scaleEnd.setDate(endDate.getDate() + (7 - endDate.getDay()));
      break;
    case 'day':
      scaleStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      scaleEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
      break;
    default:
      scaleStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      scaleEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
  }

  // 시작점을 더 앞으로, 끝점을 더 뒤로 확장하여 여분의 컬럼 추가
  let extendedStart = new Date(scaleStart);
  let extendedEnd = new Date(scaleEnd);
  
  // 단위에 따라 확장 범위 결정 - 시작과 끝에 정확히 1개 단위씩만 추가
  switch (unit) {
    case 'year':
      extendedStart = new Date(scaleStart.getFullYear() - 1, 0, 1); // 1년 전
      extendedEnd = new Date(scaleEnd.getFullYear() + 1, 0, 1); // 1년 후
      break;
    case 'quarter':
      // 시작: 이전 분기
      const startQuarter = Math.floor(scaleStart.getMonth() / 3);
      if (startQuarter === 0) {
        extendedStart = new Date(scaleStart.getFullYear() - 1, 9, 1); // 전년도 Q4
      } else {
        extendedStart = new Date(scaleStart.getFullYear(), (startQuarter - 1) * 3, 1);
      }
      // 끝: 다음 분기
      const endQuarter = Math.floor((scaleEnd.getMonth() - 1) / 3);
      const nextQuarter = (endQuarter + 1) % 4;
      if (nextQuarter === 0) {
        extendedEnd = new Date(scaleEnd.getFullYear() + 1, 0, 1); // 다음년도 Q1
      } else {
        extendedEnd = new Date(scaleEnd.getFullYear(), nextQuarter * 3, 1);
      }
      break;
    case 'month':
      // 시작: 이전 달
      extendedStart = new Date(scaleStart.getFullYear(), scaleStart.getMonth() - 1, 1);
      // 끝: 다음 달
      extendedEnd = new Date(scaleEnd.getFullYear(), scaleEnd.getMonth() + 1, 1);
      break;
    case 'week':
      extendedStart = new Date(scaleStart);
      extendedStart.setDate(extendedStart.getDate() - 7); // 1주 전
      extendedEnd = new Date(scaleEnd);
      extendedEnd.setDate(extendedEnd.getDate() + 7); // 1주 후
      break;
    case 'day':
      // Don't extend the timeline for day view to show exact project dates
      extendedStart = new Date(scaleStart);
      extendedEnd = new Date(scaleEnd);
      break;
    default:
      extendedStart = new Date(scaleStart.getFullYear(), scaleStart.getMonth() - 1, 1);
      extendedEnd = new Date(scaleEnd.getFullYear(), scaleEnd.getMonth() + 1, 1);
  }

  let current = new Date(extendedStart);
  while (current < extendedEnd) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const date = current.getDate();
    
    let nextDate;
    let label;

    switch (unit) {
      case 'year':
        // 연도만 표시
        nextDate = new Date(year + 1, 0, 1);
        label = year.toString();
        break;

      case 'quarter':
        // 분기 단위로 표시
        const quarter = Math.floor(month / 3) + 1;
        nextDate = new Date(year, (quarter * 3), 1);
        label = `Q${quarter}` //: ${quarter === 1 ? '1월~3월' : quarter === 2 ? '4월~6월' : quarter === 3 ? '7월~9월' : '10월~12월'}`;
        break;

      case 'month':
        // 월 단위로 표시
        nextDate = new Date(year, month + 1, 1);
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        label = monthNames[month];
        break;

      case 'week':
        // 주 단위로 표시 - 연속적인 주차 번호 계산
        // 연도 시작부터의 주차 번호 계산
        const yearStart = new Date(year, 0, 1);
        const daysSinceYearStart = Math.floor((current - yearStart) / (24 * 60 * 60 * 1000));
        const weeksSinceYearStart = Math.floor(daysSinceYearStart / 7);
        
        // 다음 주의 시작일 (7일 후)
        nextDate = new Date(current);
        nextDate.setDate(nextDate.getDate() + 7);
        
        // 연속적인 주차 번호
        const weekNum = weeksSinceYearStart + 1;
        label = `W${weekNum}`;
        break;

      case 'day':
        // 일 단위로 표시
        nextDate = new Date(year, month, date + 1);
        label = date.toString();
        break;

      default:
        nextDate = new Date(year, month + 1, 1);
        label = new Date(year, month, 1).toLocaleString('default', { month: 'short' });
    }

    scale.push({
      date: new Date(current),
      label,
      isWeekend: unit === 'day' && (current.getDay() === 0 || current.getDay() === 6)
    });

    current = nextDate;
  }

  return scale;
}

/**
 * 특정 연도와 월의 주차 수를 계산합니다.
 * @param {number} year - 연도
 * @param {number} month - 월 (0-11)
 * @returns {number} 해당 월의 주차 수
 */
function getWeeksInMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDay.getDay(); // 0=일요일, 1=월요일, ...
  const lastDate = lastDay.getDate();
  
  // 첫 주가 불완전한 주인지 확인
  const firstWeekDays = 7 - firstDayWeekday;
  const remainingDays = lastDate - firstWeekDays;
  const fullWeeks = Math.floor(remainingDays / 7);
  const hasPartialLastWeek = remainingDays % 7 > 0;
  
  return 1 + fullWeeks + (hasPartialLastWeek ? 1 : 0);
}

/**
 * 상위 스케일을 중복 없이 생성합니다.
 * @param {Array} scale - 기본 스케일 배열
 * @param {string} unit - 시간 단위
 * @returns {Array} 상위 스케일 배열
 */
export function generateUpperScales(scale, unit) {
  if (!scale || scale.length === 0) return [];
  const upperScales = [];
  const processedLabels = new Set();
  
  switch (unit) {
    case 'month':
      // 연도와 분기 스케일 생성 - 동적 span 계산
      const yearScales = [];
      const quarterScales = [];
      const yearCounts = new Map();
      const quarterCounts = new Map();
      
      // 각 연도와 분기별 실제 월 수 계산
      scale.forEach((item, index) => {        
        const year = item.date.getFullYear();
        const quarter = Math.floor(item.date.getMonth() / 3) + 1;
        const yearKey = `year-${year}`;
        const quarterKey = `quarter-${year}-${quarter}`;
        
        // 연도별 월 수 카운트
        if (!yearCounts.has(yearKey)) {
          yearCounts.set(yearKey, { startIndex: index, count: 0 });
        }
        yearCounts.get(yearKey).count++;
        
        // 분기별 월 수 카운트
        if (!quarterCounts.has(quarterKey)) {
          quarterCounts.set(quarterKey, { startIndex: index, count: 0, quarter: quarter });
        }
        quarterCounts.get(quarterKey).count++;
      });
      
      // 연도 스케일 생성
      yearCounts.forEach((data, yearKey) => {
        const year = yearKey.split('-')[1];
        yearScales.push({
          label: year,
          startIndex: data.startIndex,
          span: data.count,
          level: 0
        });
      });
      
      // 분기 스케일 생성
      quarterCounts.forEach((data, quarterKey) => {
        quarterScales.push({
          label: `Q${data.quarter}`,
          startIndex: data.startIndex,
          span: data.count,
          level: 1
        });
      });
      
      upperScales.push(...yearScales, ...quarterScales);
      break;
      
    case 'quarter':
      // 연도 스케일만 생성 - 동적 span 계산
      const quarterYearCounts = new Map();
      
      // 각 연도별 실제 분기 수 계산
      scale.forEach((item, index) => {
        const year = item.date.getFullYear();
        const yearKey = `year-${year}`;
        
        if (!quarterYearCounts.has(yearKey)) {
          quarterYearCounts.set(yearKey, { startIndex: index, count: 0 });
        }
        quarterYearCounts.get(yearKey).count++;
      });
      
      // 연도 스케일 생성
      quarterYearCounts.forEach((data, yearKey) => {
        const year = yearKey.split('-')[1];
        upperScales.push({
          label: year,
          startIndex: data.startIndex,
          span: data.count,
          level: 0
        });
      });
      break;
      
    case 'week':
      // 연도, 분기, 월 스케일 생성 (동적 span 계산)
      const weekYearScales = [];
      const weekQuarterScales = [];
      const weekMonthScales = [];
      
      // 각 연도/분기/월별 주차 수를 계산하기 위한 맵
      const yearWeekCounts = new Map();
      const quarterWeekCounts = new Map();
      const monthWeekCounts = new Map();
      
      // 실제 스케일에서 각 월에 포함된 주차 수를 계산
      scale.forEach((item) => {
        const year = item.date.getFullYear();
        const quarter = Math.floor(item.date.getMonth() / 3) + 1;
        const month = item.date.getMonth();
        const yearKey = `year-${year}`;
        const quarterKey = `quarter-${year}-${quarter}`;
        const monthKey = `month-${year}-${month}`;
        
        // 연도별 주차 수 계산
        if (!yearWeekCounts.has(yearKey)) {
          yearWeekCounts.set(yearKey, 0);
        }
        yearWeekCounts.set(yearKey, yearWeekCounts.get(yearKey) + 1);
        
        // 분기별 주차 수 계산
        if (!quarterWeekCounts.has(quarterKey)) {
          quarterWeekCounts.set(quarterKey, 0);
        }
        quarterWeekCounts.set(quarterKey, quarterWeekCounts.get(quarterKey) + 1);
        
        // 월별 주차 수 계산 (실제 스케일에서 해당 월에 포함된 주차 수)
        if (!monthWeekCounts.has(monthKey)) {
          monthWeekCounts.set(monthKey, 0);
        }
        monthWeekCounts.set(monthKey, monthWeekCounts.get(monthKey) + 1);
      });
      
      // 이제 실제 스케일 생성
      scale.forEach((item, index) => {
        const year = item.date.getFullYear();
        const quarter = Math.floor(item.date.getMonth() / 3) + 1;
        const month = item.date.getMonth();
        const yearKey = `year-${year}`;
        const quarterKey = `quarter-${year}-${quarter}`;
        const monthKey = `month-${year}-${month}`;
        
        // 연도 스케일
        if (!processedLabels.has(yearKey)) {
          weekYearScales.push({
            label: year.toString(),
            startIndex: index,
            span: yearWeekCounts.get(yearKey),
            level: 0
          });
          processedLabels.add(yearKey);
        }
        
        // 분기 스케일
        if (!processedLabels.has(quarterKey)) {
          weekQuarterScales.push({
            label: `Q${quarter}`,
            startIndex: index,
            span: quarterWeekCounts.get(quarterKey),
            level: 1
          });
          processedLabels.add(quarterKey);
        }
        
        // 월 스케일
        if (!processedLabels.has(monthKey)) {
          const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
          weekMonthScales.push({
            label: monthNames[month],
            startIndex: index,
            span: monthWeekCounts.get(monthKey),
            level: 2
          });
          processedLabels.add(monthKey);
        }
      });
      
      upperScales.push(...weekYearScales, ...weekQuarterScales, ...weekMonthScales);
      break;
      
    case 'day':
      // 연도, 분기, 월, 주 스케일 생성 (동적 span 계산)
      const dayYearScales = [];
      const dayQuarterScales = [];
      const dayMonthScales = [];
      const dayWeekScales = [];
      
      // 각 단위별 일수 계산을 위한 맵
      const yearDayCounts = new Map();
      const quarterDayCounts = new Map();
      const monthDayCounts = new Map();
      const weekDayCounts = new Map();
      
      // 먼저 각 단위별 일수를 계산
      scale.forEach((item) => {
        const year = item.date.getFullYear();
        const quarter = Math.floor(item.date.getMonth() / 3) + 1;
        const month = item.date.getMonth();
        
        // 연도 시작부터의 주차 번호 계산 (연속적)
        const yearStart = new Date(year, 0, 1);
        const daysSinceYearStart = Math.floor((item.date - yearStart) / (24 * 60 * 60 * 1000));
        const weeksSinceYearStart = Math.floor(daysSinceYearStart / 7);
        const week = weeksSinceYearStart + 1;
        
        const yearKey = `year-${year}`;
        const quarterKey = `quarter-${year}-${quarter}`;
        const monthKey = `month-${year}-${month}`;
        const weekKey = `week-${year}-${week}`;
        
        // 연도별 일수 계산
        if (!yearDayCounts.has(yearKey)) {
          const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
          yearDayCounts.set(yearKey, isLeapYear ? 366 : 365);
        }
        
        // 분기별 일수 계산
        if (!quarterDayCounts.has(quarterKey)) {
          let totalDays = 0;
          const startMonth = (quarter - 1) * 3;
          for (let m = startMonth; m < startMonth + 3; m++) {
            totalDays += new Date(year, m + 1, 0).getDate();
          }
          quarterDayCounts.set(quarterKey, totalDays);
        }
        
        // 월별 일수 계산
        if (!monthDayCounts.has(monthKey)) {
          monthDayCounts.set(monthKey, new Date(year, month + 1, 0).getDate());
        }
        
        // 주별 일수 계산 (7일 고정)
        if (!weekDayCounts.has(weekKey)) {
          weekDayCounts.set(weekKey, 7);
        }
      });
      
      // 이제 실제 스케일 생성
      scale.forEach((item, index) => {
        const year = item.date.getFullYear();
        const quarter = Math.floor(item.date.getMonth() / 3) + 1;
        const month = item.date.getMonth();
        
        // 연도 시작부터의 주차 번호 계산 (연속적)
        const yearStart = new Date(year, 0, 1);
        const daysSinceYearStart = Math.floor((item.date - yearStart) / (24 * 60 * 60 * 1000));
        const weeksSinceYearStart = Math.floor(daysSinceYearStart / 7);
        const week = weeksSinceYearStart + 1;
        
        const yearKey = `year-${year}`;
        const quarterKey = `quarter-${year}-${quarter}`;
        const monthKey = `month-${year}-${month}`;
        const weekKey = `week-${year}-${week}`;
        
        // 연도 스케일
        if (!processedLabels.has(yearKey)) {
          dayYearScales.push({
            label: year.toString(),
            startIndex: index,
            span: yearDayCounts.get(yearKey),
            level: 0
          });
          processedLabels.add(yearKey);
        }
        
        // 분기 스케일
        if (!processedLabels.has(quarterKey)) {
          dayQuarterScales.push({
            label: `Q${quarter}`,
            startIndex: index,
            span: quarterDayCounts.get(quarterKey),
            level: 1
          });
          processedLabels.add(quarterKey);
        }
        
        // 월 스케일
        if (!processedLabels.has(monthKey)) {
          const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
          dayMonthScales.push({
            label: monthNames[month],
            startIndex: index,
            span: monthDayCounts.get(monthKey),
            level: 2
          });
          processedLabels.add(monthKey);
        }
        
        // 주 스케일
        if (!processedLabels.has(weekKey)) {
          dayWeekScales.push({
            label: `W${week}`,
            startIndex: index,
            span: weekDayCounts.get(weekKey),
            level: 3
          });
          processedLabels.add(weekKey);
        }
      });
      
      upperScales.push(...dayYearScales, ...dayQuarterScales, ...dayMonthScales, ...dayWeekScales);
      break;
  }
  
  return upperScales;
}

/**
 * 시간 단위에 따른 포맷을 반환합니다.
 * @param {string} unit - 시간 단위
 * @returns {string} 포맷 문자열
 */
const getFormatForUnit = (unit) => {
  switch (unit) {
    case 'day':
      return 'DD';
    case 'week':
      return 'MM/DD';
    case 'month':
      return 'MMM';
    case 'quarter':
      return 'Q';
    case 'year':
      return 'YYYY';
    default:
      return 'MM/DD';
  }
};

/**
 * 숫자를 콤마로 구분된 문자열로 변환합니다.
 * @param {number} number - 숫자
 * @returns {string} 콤마로 구분된 문자열
 */
export const formatNumberWithCommas = (number) => {
  if (number === 0) return "0";
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * 태스크 타입에 따른 CSS 클래스를 반환합니다.
 * @param {string} type - 태스크 타입
 * @returns {string} CSS 클래스
 */
export const getTaskTypeClass = (type) => {
  switch (type) {
    case 'task':
      return 'gantt-task';
    case 'milestone':
      return 'gantt-milestone';
    case 'summary':
      return 'gantt-summary';
    default:
      return 'gantt-task';
  }
};

/**
 * 태스크들의 진척도를 동적으로 계산합니다 (bottom-up 방식).
 * 상위 태스크의 진척도는 하위 태스크들의 진척도 평균값으로 계산됩니다.
 * 마일스톤 타입의 태스크는 진척도 필드가 제거됩니다.
 * @param {Array} tasks - 모든 태스크 배열
 * @returns {Array} 업데이트된 진척도를 가진 태스크 배열
 */
export const calculateDynamicProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  // 태스크를 ID로 매핑
  const taskMap = new Map();
  tasks.forEach(task => {
    taskMap.set(task.id, { 
      ...task, 
      originalProgress: task.type === 'milestone' ? undefined : (task.progress || 0),
      calculatedProgress: task.type === 'milestone' ? undefined : (task.progress || 0),
      hasChildren: false 
    });
  });
  
  // 각 태스크가 자식을 가지고 있는지 확인
  tasks.forEach(task => {
    if (task.parent && task.parent !== 0) {
      const parentTask = taskMap.get(task.parent);
      if (parentTask) {
        parentTask.hasChildren = true;
      }
    }
  });
  
  // Bottom-up 계산을 위해 depth를 계산
  const calculateDepth = (taskId, visited = new Set()) => {
    if (visited.has(taskId)) return 0; // 순환 참조 방지
    visited.add(taskId);
    
    const task = taskMap.get(taskId);
    if (!task) return 0;
    
    let maxChildDepth = 0;
    tasks.forEach(childTask => {
      if (childTask.parent === taskId) {
        const childDepth = calculateDepth(childTask.id, new Set(visited));
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    });
    
    return maxChildDepth + 1;
  };
  
  // 모든 태스크의 depth 계산
  const taskDepths = new Map();
  tasks.forEach(task => {
    taskDepths.set(task.id, calculateDepth(task.id));
  });
  
  // depth 순서대로 정렬 (가장 깊은 것부터 - bottom-up)
  const sortedTasks = [...tasks].sort((a, b) => {
    const depthA = taskDepths.get(a.id);
    const depthB = taskDepths.get(b.id);
    return depthB - depthA; // 내림차순 정렬
  });
  
  // Bottom-up으로 진척도 계산
  sortedTasks.forEach(task => {
    const currentTask = taskMap.get(task.id);
    if (!currentTask) return;
    
    // 마일스톤 타입은 진척도 필드 제거
    if (currentTask.type === 'milestone') {
      currentTask.calculatedProgress = undefined;
      return;
    }
    
    // 자식 태스크들 찾기
    const childTasks = tasks.filter(t => t.parent === task.id);
    
    if (childTasks.length > 0) {
      // 자식 태스크가 있으면 자식들의 진척도 평균 계산 (마일스톤 제외)
      let totalProgress = 0;
      let validChildCount = 0;
      
      childTasks.forEach(child => {
        const childTask = taskMap.get(child.id);
        // 마일스톤이 아닌 자식 태스크만 계산에 포함
        if (childTask && childTask.calculatedProgress !== undefined && childTask.type !== 'milestone') {
          totalProgress += childTask.calculatedProgress;
          validChildCount++;
        }
      });
      
      if (validChildCount > 0) {
        currentTask.calculatedProgress = Math.round(totalProgress / validChildCount);
      } else {
        // 마일스톤이 아닌 자식이 없으면 원본 진척도 유지
        currentTask.calculatedProgress = currentTask.originalProgress;
      }
    } else {
      // 자식 태스크가 없으면 원본 진척도 사용 (리프 노드)
      currentTask.calculatedProgress = currentTask.originalProgress;
    }
  });
  
  // 결과를 원래 태스크 배열 순서로 반환
  return tasks.map(task => {
    const updatedTask = taskMap.get(task.id);
    if (task.type === 'milestone') {
      // 마일스톤은 progress, price_ratio, price를 0으로 고정
      return {
        ...task,
        progress: 0,
        price_ratio: 0,
        price: 0
      };
    } else {
      return {
        ...task,
        progress: updatedTask ? updatedTask.calculatedProgress : (task.progress || 0)
      };
    }
  });
};

/**
 * 특정 태스크의 진척도가 변경되었을 때 상위 태스크들의 진척도를 업데이트합니다.
 * 마일스톤 타입의 태스크는 진척도 필드가 제거됩니다.
 * @param {Array} tasks - 모든 태스크 배열
 * @param {number} changedTaskId - 변경된 태스크 ID
 * @param {number} newProgress - 새로운 진척도 값
 * @returns {Array} 업데이트된 태스크 배열
 */
export const updateProgressCascade = (tasks, changedTaskId, newProgress) => {
  if (!tasks || tasks.length === 0) return [];
  
  // 변경할 태스크가 마일스톤인지 확인
  const changedTask = tasks.find(task => task.id === changedTaskId);
  if (changedTask && changedTask.type === 'milestone') {
    // 마일스톤의 경우 진척도, 보할, 예산을 0으로 고정하고 상위 태스크 계산에는 포함하지 않음
    return tasks.map(task => 
      task.id === changedTaskId 
        ? { ...task, progress: 0, price_ratio: 0, price: 0 }
        : task
    );
  }
  
  // 먼저 해당 태스크의 진척도를 업데이트
  const updatedTasks = tasks.map(task => 
    task.id === changedTaskId 
      ? { ...task, progress: newProgress }
      : task
  );
  
  // 전체 진척도 재계산 (마일스톤 제외)
  return calculateDynamicProgress(updatedTasks);
}; 

/**
 * 프로젝트와 단계의 날짜, 진척도, 성숙도를 자동으로 계산합니다.
 * @param {Array} tasks - 모든 태스크 배열
 * @returns {Array} 업데이트된 태스크 배열
 */
export const calculateProjectAndPhaseValues = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  const taskMap = new Map();
  const result = [];
  
  // 태스크를 ID로 매핑하고 자식 태스크 관계 설정
  tasks.forEach(task => {
    taskMap.set(task.id, { 
      ...task, 
      children: [],
      isCalculated: false
    });
  });
  
  // 부모-자식 관계 설정
  tasks.forEach(task => {
    if (task.parent && task.parent !== 0) {
      const parentTask = taskMap.get(task.parent);
      if (parentTask) {
        parentTask.children.push(task.id);
      }
    }
  });
  
  // Bottom-up 방식으로 계산 (자식부터 부모 순서로)
  const calculateTask = (taskId) => {
    const task = taskMap.get(taskId);
    if (!task || task.isCalculated) return task;
    
    // 자식 태스크들을 먼저 계산
    const childTasks = task.children.map(childId => calculateTask(childId)).filter(Boolean);
    
    if (task.type === TaskType.PROJECT) {
      // 프로젝트: 모든 하위 태스크의 첫날짜~끝날짜, 진척도/성숙도 평균
      if (childTasks.length > 0) {
        const childDates = childTasks.flatMap(child => [new Date(child.start), new Date(child.end)]);
        const minDate = new Date(Math.min(...childDates));
        const maxDate = new Date(Math.max(...childDates));
        
        task.start = minDate;
        task.end = maxDate;
        
        // 진척도 평균 계산 (task 타입과 phase 타입 모두 포함, 마일스톤 제외)
        const taskChildren = childTasks.filter(child => child.type === TaskType.TASK && child.subType !== 'milestone');
        const phaseChildren = childTasks.filter(child => child.type === TaskType.PHASE);
        const allChildren = [...taskChildren, ...phaseChildren];
        
        if (allChildren.length > 0) {
          const avgProgress = allChildren.reduce((sum, child) => sum + (child.progress || 0), 0) / allChildren.length;
          task.progress = Math.round(avgProgress);
          
          // 가격 총합 계산 (하위 태스크들의 가격을 숫자로 변환하여 합산, 마일스톤 제외)
          const totalPrice = allChildren.reduce((sum, child) => {
            // 가격이 문자열이면 콤마를 제거하고 숫자로 변환
            const childPrice = typeof child.price === 'string' 
              ? parseFloat(child.price.replace(/,/g, '')) || 0
              : child.price || 0;
            return sum + childPrice;
          }, 0);
          
          // 총합을 콤마 포맷으로 변환하여 저장
          task.price = formatNumberWithCommas(totalPrice);
          // console.log(`Project ${task.id} (${task.text}): calculated total price ${task.price} from ${allChildren.length} children (milestones excluded)`);
          
          // 진척도에 따른 성숙도 자동 업데이트
          if (task.progress === 100) {
            task.maturity = MaturityType.COMPLETED;
            // console.log(`Project ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          } else if (task.progress > 0 && task.progress < 100) {
            task.maturity = MaturityType.IN_PROGRESS;
            // console.log(`Project ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          } else if (task.progress === 0) {
            task.maturity = MaturityType.DRAFT;
            // console.log(`Project ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          }
        }
      }
    } else if (task.type === TaskType.PHASE) {
      // 단계: 하위 태스크들의 진척도/성숙도 평균 (날짜는 하위 태스크 범위로 자동 조정)
      if (childTasks.length > 0) {
        // 날짜 자동 조정 (하위 태스크 중 TASK 타입만, 마일스톤 제외)
        const taskChildren = childTasks.filter(child => child.type === TaskType.TASK && child.subType !== 'milestone');
        if (taskChildren.length > 0) {
          const childDates = taskChildren.flatMap(child => [new Date(child.start), new Date(child.end)]);
          const minDate = new Date(Math.min(...childDates));
          const maxDate = new Date(Math.max(...childDates));
          task.start = minDate;
          task.end = maxDate;

          // 진척도 평균 계산 (마일스톤 제외)
          const avgProgress = taskChildren.reduce((sum, child) => sum + (child.progress || 0), 0) / taskChildren.length;
          task.progress = Math.round(avgProgress);

          // 가격 총합 계산 (하위 태스크들의 가격을 숫자로 변환하여 합산, 마일스톤 제외)
          const totalPrice = taskChildren.reduce((sum, child) => {
            // 가격이 문자열이면 콤마를 제거하고 숫자로 변환
            const childPrice = typeof child.price === 'string' 
              ? parseFloat(child.price.replace(/,/g, '')) || 0
              : child.price || 0;
            return sum + childPrice;
          }, 0);
          
          // 총합을 콤마 포맷으로 변환하여 저장
          task.price = formatNumberWithCommas(totalPrice);
          // console.log(`Phase ${task.id} (${task.text}): calculated total price ${task.price} from ${taskChildren.length} children (milestones excluded)`);

          // 진척도에 따른 성숙도 자동 업데이트
          if (task.progress === 100) {
            task.maturity = MaturityType.COMPLETED;
            // console.log(`Phase ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          } else if (task.progress > 0 && task.progress < 100) {
            task.maturity = MaturityType.IN_PROGRESS;
            // console.log(`Phase ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          } else if (task.progress === 0) {
            task.maturity = MaturityType.DRAFT;
            // console.log(`Phase ${task.id} (${task.text}): progress ${task.progress}% -> maturity ${task.maturity}`);
          }
        }
      }
    }
    
    task.isCalculated = true;
    taskMap.set(taskId, task);
    return task;
  };
  
  // 모든 태스크에 대해 계산 수행
  tasks.forEach(task => {
    const calculatedTask = calculateTask(task.id);
    if (calculatedTask) {
      result.push(calculatedTask);
    }
  });
  
  return result;
};

/**
 * 성숙도를 숫자 값으로 변환합니다.
 * @param {string} maturity - 성숙도 문자열
 * @returns {number} 숫자 값 (0-3)
 */
const getMaturityNumericValue = (maturity) => {
  switch (maturity) {
    case MaturityType.DRAFT: return 0;
    case 'PLANNED': return 1; // 이전 버전 호환성 유지
    case MaturityType.IN_PROGRESS: return 2;
    case MaturityType.COMPLETED: return 3;
    default: return 0;
  }
};

/**
 * 숫자 값을 성숙도로 변환합니다.
 * @param {number} value - 숫자 값 (0-3)
 * @returns {string} 성숙도 문자열
 */
const getMaturityFromNumericValue = (value) => {
  switch (value) {
    case 0: return MaturityType.DRAFT;
    case 1: return 'PLANNED'; // 이전 버전 호환성 유지
    case 2: return MaturityType.IN_PROGRESS;
    case 3: return MaturityType.COMPLETED;
    default: return MaturityType.DRAFT;
  }
};

/**
 * 태스크 타입이 편집 가능한지 확인합니다.
 * @param {string} taskType - 태스크 타입
 * @param {string} field - 편집할 필드명
 * @param {string} taskSubType - 태스크 서브타입 (optional)
 * @returns {boolean} 편집 가능 여부
 */
export const isTaskFieldEditable = (taskType, field, taskSubType) => {
  switch (taskType) {
    case TaskType.PROJECT:
      // 프로젝트는 모든 필드가 자동 계산
      return false;
    case TaskType.PHASE:
      // 단계는 텍스트만 편집 가능, 날짜/진척도/성숙도는 자동 계산
      return field === 'text';
    case TaskType.TASK:
      // 마일스톤인 경우 날짜와 텍스트, 서브타입만 편집 가능
      if (taskSubType === TaskSubType.MILESTONE) {
        return field === 'start' || field === 'end' || field === 'text' || field === 'subType';
      }
      // 일반 태스크는 모든 필드 편집 가능
      return true;
    default:
      return true;
  }
};

/**
 * 태스크에 하위 태스크를 추가할 수 있는지 확인합니다.
 * @param {string} taskType - 태스크 타입
 * @returns {boolean} 하위 태스크 추가 가능 여부
 */
export const canAddChildTask = (taskType) => {
  return taskType === TaskType.PROJECT || taskType === TaskType.PHASE;
}; 
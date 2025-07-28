import React, { useState, useEffect, useRef } from "react";
import { CustomGantt } from "../components/CustomGantt";
import { MaturityType, TaskSubType } from "../components/CustomGantt/types";
import { updateTaskMaturityWithCascade, isTaskOverdue } from "../components/CustomGantt/maturityUtils";
import { calculateProjectAndPhaseValues } from "../components/CustomGantt/utils";
import { 
  loadTasksFromLocal, 
  saveTasksToLocal, 
  clearLocalTasks, 
  getLocalStorageInfo,
  exportTasksToFile,
  importTasksFromFile
} from "../utils/localStorage";
import api from "../api";

const Schedule = () => {
  const [zoomLevel, setZoomLevel] = useState("month");
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTaskIdForEdit, setNewTaskIdForEdit] = useState(null);
  const [useLocalStorage, setUseLocalStorage] = useState(true); // 로컬 스토리지 사용 여부
  const [autoSave, setAutoSave] = useState(true); // 자동 저장 여부
  const [storageInfo, setStorageInfo] = useState(null); // 스토리지 정보
  const [connections, setConnections] = useState([]); // 태스크 연결 정보
  const [isConnectionMode, setIsConnectionMode] = useState(false); // 네트워크 연결 모드
  const ganttRef = useRef(null);
  const today = new Date();

  // 1000단위로 콤마를 추가하는 함수
  const formatNumberWithCommas = (number) => {
    if (number === 0) return "0";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // 지연된 태스크 자동 업데이트
  useEffect(() => {
    const checkOverdueTasks = () => {
      setTasks(prevTasks => {
        let hasChanges = false;
        const updatedTasks = prevTasks.map(task => {
          // 완료된 태스크는 지연 상태로 변경하지 않음
          if (task.maturity === MaturityType.COMPLETED) {
            return task;
          }
          
          // 지연된 태스크 확인
          if (isTaskOverdue(task)) {
            hasChanges = true;
            // console.log(`Task ${task.id} "${task.text}" is overdue`);
            return {
              ...task,
              // 지연 상태는 색상으로만 표시하고 maturity는 변경하지 않음
            };
          }
          
          return task;
        });
        
        return hasChanges ? updatedTasks : prevTasks;
      });
    };

    // 초기 확인
    checkOverdueTasks();
    
    // 1분마다 확인
    const interval = setInterval(checkOverdueTasks, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // 로컬 스토리지에서 태스크 로드 또는 초기 데이터 설정
  useEffect(() => {
    // 로컬 스토리지에서 태스크 로드 시도
    if (useLocalStorage) {
      const loadedTasks = loadTasksFromLocal();
      if (loadedTasks && loadedTasks.length > 0) {
        // console.log(`Loaded ${loadedTasks.length} tasks from localStorage`);
        setTasks(loadedTasks);
        updateStorageInfo();
        return;
      }
    }

    // 로컬 스토리지에 데이터가 없거나 사용하지 않는 경우 초기 데이터 설정
    // console.log('No tasks in localStorage, using initial data');
    const initialTasks = [
      // 프로젝트 전체
      {
        id: 1,
        text: "대국상부승강장건축공사",
        start: new Date(2025, 0, 1),
        end: new Date(2025, 11, 31),
        duration: 365,
        progress: 0, // 자동 계산될 예정 (하위 태스크들의 평균)
        price: formatNumberWithCommas(12800000000),
        price_ratio: 100,
        type: "project",
        parent: 0,
        maturity: MaturityType.DRAFT, // 초기 상태 (진행중으로 자동 변경될 예정)
      },
      
      // 1단계: 준비 및 설계
      {
        id: 10,
        text: "1단계: 준비 및 설계",
        start: new Date(2025, 0, 1),
        end: new Date(2025, 2, 31),
        duration: 90,
        progress: 0,
        price: formatNumberWithCommas(480000000),
        price_ratio: 3.75,
        parent: 1,
        type: "phase",
        maturity: MaturityType.DRAFT, // 초기 상태 (진행중으로 자동 변경될 예정)
      },
      {
        id: 11,
        text: "현장조사 및 측량",
        start: new Date(2024, 11, 1), // 과거 날짜로 설정 (테스트용)
        end: new Date(2024, 11, 15), // 과거 날짜로 설정 (테스트용)
        duration: 15,
        progress: 50, // 테스트용 진척도 설정
        price: formatNumberWithCommas(120000000),
        price_ratio: 0.94,
        parent: 10,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.IN_PROGRESS, // 진행 중 상태로 설정
      },
      {
        id: 12,
        text: "실시설계 및 도면작성",
        start: new Date(2025, 0, 16),
        end: new Date(2025, 1, 28),
        duration: 44,
        progress: 100,
        price: formatNumberWithCommas(280000000),
        price_ratio: 2.19,
        parent: 10,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.COMPLETED, // 완료 상태로 설정
      },
      {
        id: 13,
        text: "인허가 및 승인",
        start: new Date(2024, 11, 20), // 과거 시작일 (테스트용)
        end: new Date(2025, 2, 31),
        duration: 45,
        progress: 25, // 테스트용 진척도 설정
        price: formatNumberWithCommas(80000000),
        price_ratio: 0.63,
        parent: 10,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.DRAFT, // 초안 상태로 설정 (진행중으로 자동 변경될 예정)
      },
      
      // 2단계: 기초공사
      {
        id: 20,
        text: "2단계: 기초공사",
        start: new Date(2025, 2, 1),
        end: new Date(2025, 4, 31),
        duration: 90,
        progress: 0, // 자동 계산될 예정 (하위 태스크들의 평균)
        price: formatNumberWithCommas(2560000000),
        price_ratio: 20,
        parent: 1,
        type: "phase",
        maturity: MaturityType.DRAFT, // 초기 상태 (진행중으로 자동 변경될 예정)
      },
      {
        id: 21,
        text: "가설공사 및 현장정리",
        start: new Date(2025, 2, 1),
        end: new Date(2025, 2, 31),
        duration: 31,
        progress: 75, // 테스트용 진척도 설정
        price: formatNumberWithCommas(320000000),
        price_ratio: 2.5,
        parent: 20,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.IN_PROGRESS, // 진행 중 상태로 설정
      },
      {
        id: 22,
        text: "토공사 및 굴착",
        start: new Date(2025, 3, 1),
        end: new Date(2025, 3, 20),
        duration: 20,
        progress: 0,
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 20,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.DRAFT, // 초안 상태로 설정 (테스트용)
      },
      {
        id: 23,
        text: "기초철근 및 거푸집",
        start: new Date(2025, 3, 21),
        end: new Date(2025, 4, 10),
        duration: 20,
        progress: 0,
        price: formatNumberWithCommas(960000000),
        price_ratio: 7.5,
        parent: 20,
        type: "task",
        subType: TaskSubType.NORMAL,
        maturity: MaturityType.PLANNED, // 계획 상태로 설정 (테스트용)
      },
      {
        id: 24,
        text: "기초콘크리트 타설",
        start: new Date(2025, 4, 11),
        end: new Date(2025, 4, 31),
        duration: 21,
        progress: 30, // 진척도는 30%이지만 성숙도는 설정하지 않음 (테스트용)
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 20,
        type: "task",
        subType: TaskSubType.NORMAL,
        // maturity: MaturityType.DRAFT, // 명시적으로 설정하지 않음 (자동 업데이트 테스트)
      },
      
      // 3단계: 골조공사
      {
        id: 30,
        text: "3단계: 골조공사",
        start: new Date(2025, 4, 15),
        end: new Date(2025, 7, 31),
        duration: 108,
        progress: 0, // 자동 계산될 예정 (하위 태스크들의 평균)
        price: formatNumberWithCommas(3840000000),
        price_ratio: 30,
        parent: 1,
        type: "phase",
        maturity: MaturityType.DRAFT, // 초기 상태 (진행중으로 자동 변경될 예정)
      },
      {
        id: 31,
        text: "지하층 골조공사",
        start: new Date(2025, 4, 15),
        end: new Date(2025, 5, 30),
        duration: 46,
        progress: 0,
        price: formatNumberWithCommas(1280000000),
        price_ratio: 10,
        parent: 30,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      {
        id: 32,
        text: "지상층 골조공사",
        start: new Date(2025, 5, 15),
        end: new Date(2025, 7, 15),
        duration: 61,
        progress: 0,
        price: formatNumberWithCommas(1920000000),
        price_ratio: 15,
        parent: 30,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      {
        id: 33,
        text: "지붕 및 옥상공사",
        start: new Date(2025, 7, 1),
        end: new Date(2025, 7, 31),
        duration: 31,
        progress: 0,
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 30,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      
      // 4단계: 마감공사
      {
        id: 40,
        text: "4단계: 마감공사",
        start: new Date(2025, 7, 1),
        end: new Date(2025, 10, 31),
        duration: 122,
        progress: 0,
        price: formatNumberWithCommas(3840000000),
        price_ratio: 30,
        parent: 1,
        type: "phase",
      },
      {
        id: 41,
        text: "외부마감공사",
        start: new Date(2025, 7, 1),
        end: new Date(2025, 8, 31),
        duration: 62,
        progress: 0,
        price: formatNumberWithCommas(1280000000),
        price_ratio: 10,
        parent: 40,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      {
        id: 42,
        text: "내부마감공사",
        start: new Date(2025, 8, 1),
        end: new Date(2025, 9, 30),
        duration: 61,
        progress: 0,
        price: formatNumberWithCommas(1920000000),
        price_ratio: 15,
        parent: 40,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      {
        id: 43,
        text: "설비공사",
        start: new Date(2025, 9, 1),
        end: new Date(2025, 10, 31),
        duration: 61,
        progress: 0,
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 40,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      
      // 5단계: 완료 및 검사
      {
        id: 50,
        text: "5단계: 완료 및 검사",
        start: new Date(2025, 10, 1),
        end: new Date(2025, 11, 31),
        duration: 61,
        progress: 0,
        price: formatNumberWithCommas(1280000000),
        price_ratio: 10,
        parent: 1,
        type: "phase",
      },
      {
        id: 51,
        text: "시설물 검사",
        start: new Date(2025, 10, 1),
        end: new Date(2025, 10, 31),
        duration: 31,
        progress: 0,
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 50,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      {
        id: 52,
        text: "최종 정리 및 인계",
        start: new Date(2025, 11, 1),
        end: new Date(2025, 11, 31),
        duration: 31,
        progress: 0,
        price: formatNumberWithCommas(640000000),
        price_ratio: 5,
        parent: 50,
        type: "task",
        subType: TaskSubType.NORMAL,
      },
      
      // 마일스톤 예시들
      {
        id: 60,
        text: "설계 완료",
        start: new Date(2025, 2, 31),
        end: new Date(2025, 2, 31),
        duration: 0,
        progress: 0,
        price: 0,
        price_ratio: 0,
        parent: 10,
        type: "task",
        subType: TaskSubType.MILESTONE,
        maturity: MaturityType.DRAFT,
      },
      {
        id: 61,
        text: "기초공사 완료",
        start: new Date(2025, 4, 31),
        end: new Date(2025, 4, 31),
        duration: 0,
        progress: 0,
        price: 0,
        price_ratio: 0,
        parent: 20,
        type: "task",
        subType: TaskSubType.MILESTONE,
        maturity: MaturityType.DRAFT,
      },
      {
        id: 62,
        text: "프로젝트 완료",
        start: new Date(2025, 11, 31),
        end: new Date(2025, 11, 31),
        duration: 0,
        progress: 0,
        price: 0,
        price_ratio: 0,
        parent: 1,
        type: "task",
        subType: TaskSubType.MILESTONE,
        maturity: MaturityType.DRAFT,
      },

    ];
    
    // 모든 태스크에 기본 성숙도 추가
    let tasksWithMaturity = initialTasks.map(task => ({
      ...task,
      maturity: task.maturity || MaturityType.DRAFT
    }));

    // 진척도에 따른 성숙도 자동 업데이트 함수
    const updateMaturityBasedOnProgress = (tasks) => {
      return tasks.map(task => {
        let updatedMaturity = task.maturity;
        
        if (task.progress === 100 && task.maturity !== MaturityType.COMPLETED) {
          updatedMaturity = MaturityType.COMPLETED;
          // console.log(`Initial: Task ${task.id} (${task.text}) progress ${task.progress}% -> maturity ${updatedMaturity}`);
        }
        else if (task.progress > 0 && task.progress < 100) {
          if (task.maturity === MaturityType.DRAFT || task.maturity === MaturityType.PLANNED) {
            updatedMaturity = MaturityType.IN_PROGRESS;
            // console.log(`Initial: Task ${task.id} (${task.text}) progress ${task.progress}% -> maturity ${updatedMaturity}`);
          }
        }
        else if (task.progress === 0 && task.maturity === MaturityType.IN_PROGRESS) {
          updatedMaturity = MaturityType.DRAFT;
          // console.log(`Initial: Task ${task.id} (${task.text}) progress ${task.progress}% -> maturity ${updatedMaturity}`);
        }
        
        return {
          ...task,
          maturity: updatedMaturity
        };
      });
    };

    // 진척도에 따른 성숙도 업데이트 적용
    let tasksWithUpdatedMaturity = updateMaturityBasedOnProgress(tasksWithMaturity);

    // 최상위 태스크의 날짜를 하위 태스크에 맞춰 자동 조정 (calculateProjectAndPhaseValues 사용)
    import('../components/CustomGantt/utils').then(utils => {
      const adjustedTasks = utils.calculateProjectAndPhaseValues(tasksWithUpdatedMaturity);
      setTasks(adjustedTasks);
      
      // 초기 데이터를 로컬 스토리지에 저장
      if (useLocalStorage && autoSave) {
        saveTasksToLocal(adjustedTasks);
        updateStorageInfo();
        // console.log('Initial tasks saved to localStorage');
      }
    });
  }, [useLocalStorage, autoSave]);

  // 스토리지 정보 업데이트
  const updateStorageInfo = () => {
    const info = getLocalStorageInfo();
    setStorageInfo(info);
  };

  // 태스크 배열이 변경될 때 자동 저장
  useEffect(() => {
    if (tasks.length > 0 && useLocalStorage && autoSave) {
      // console.log(`Auto-saving ${tasks.length} tasks to localStorage`);
      saveTasksToLocal(tasks);
      updateStorageInfo();
    }
  }, [tasks, useLocalStorage, autoSave]);

  // 로컬 스토리지 관리 함수들
  const handleSaveToLocal = () => {
    if (saveTasksToLocal(tasks)) {
      updateStorageInfo();
      alert(`${tasks.length}개의 태스크가 로컬 스토리지에 저장되었습니다.`);
    } else {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleLoadFromLocal = () => {
    const loadedTasks = loadTasksFromLocal();
    if (loadedTasks) {
      setTasks(loadedTasks);
      updateStorageInfo();
      alert(`${loadedTasks.length}개의 태스크를 로컬 스토리지에서 불러왔습니다.`);
    } else {
      alert('로컬 스토리지에서 데이터를 불러올 수 없습니다.');
    }
  };

  const handleClearLocal = () => {
    if (window.confirm('로컬 스토리지의 모든 태스크 데이터를 삭제하시겠습니까?')) {
      if (clearLocalTasks()) {
        updateStorageInfo();
        alert('로컬 스토리지가 초기화되었습니다.');
      } else {
        alert('초기화 중 오류가 발생했습니다.');
      }
    }
  };

  const handleExportTasks = () => {
    if (exportTasksToFile(tasks)) {
      alert('태스크 데이터가 파일로 내보내졌습니다.');
    } else {
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleImportTasks = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    importTasksFromFile(file)
      .then(importedTasks => {
        if (window.confirm(`${importedTasks.length}개의 태스크를 가져왔습니다. 현재 데이터를 대체하시겠습니까?`)) {
          setTasks(importedTasks);
          if (useLocalStorage && autoSave) {
            saveTasksToLocal(importedTasks);
            updateStorageInfo();
          }
          alert('태스크 데이터를 성공적으로 가져왔습니다.');
        }
      })
      .catch(error => {
        console.error('Import error:', error);
        alert('파일을 가져오는 중 오류가 발생했습니다.');
      });
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  // 연결 관리 함수들
  const handleConnectionCreate = (connection) => {
    const newConnection = {
      id: Date.now(),
      from: connection.from,
      to: connection.to,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: connection.type || 'finish-to-start',
      color: '#1f6bd9'
    };
    
    setConnections(prev => [...prev, newConnection]);
    // console.log('Connection created:', newConnection);
  };

  const handleConnectionDelete = (connection) => {
    setConnections(prev => prev.filter(conn => 
      !(conn.from === connection.from && conn.to === connection.to)
    ));
    // console.log('Connection deleted:', connection);
  };

  // 컬럼 정의
  const columns = [
    {
      id: "text",
      header: "작업명",
      width: 200,
      resize: true,
      align: "left",
    },
    {
      id: "price",
      header: "예산",
      width: 120,
      resize: true,
      align: "right",
    },
    {
      id: "maturity",
      header: "성숙도",
      width: 80,
      resize: true,
      align: "center",
    },
    {
      id: "progress",
      header: "진척도",
      width: 80,
      resize: true,
      align: "center",
    },

  ];

  // 스케일 정의
  const scales = [
    {
      unit: zoomLevel,
      step: 1,
      format: getFormatForZoomLevel(zoomLevel),
    },
  ];

  // 마커 정의 (오늘 날짜)
  const markers = [
    {
      date: today,
      text: "오늘",
      color: "#ff4444",
      className: "today-marker",
    },
  ];

  // 줌 레벨에 따른 포맷 함수
  function getFormatForZoomLevel(level) {
    switch (level) {
      case "year":
        return "YYYY";
      case "quarter":
        return "Q";
      case "month":
        return "MMM";
      case "week":
        return "MM/DD";
      case "day":
        return "DD";
      default:
        return "MMM";
    }
  }

  // 줌 레벨에 따른 셀 너비 계산
  const getCellWidthForZoom = (zoomLevel) => {
    switch (zoomLevel) {
      case "day":
        return 30;
      case "week":
        return 40;
      case "month":
        return 60;
      case "quarter":
        return 80;
      case "year":
        return 100;
      default:
        return 50;
    }
  };

  // 줌 레벨에 따른 row 높이 계산
  const getRowHeightForZoom = (zoomLevel) => {
    switch (zoomLevel) {
      case "day":
        return 40;
      case "week":
        return 36;
      case "month":
        return 32;
      case "quarter":
        return 28;
      case "year":
        return 24;
      default:
        return 32;
    }
  };

  // 줌 레벨 변경 핸들러
  const handleZoomChange = (newZoomLevel) => {
    // console.log("Zoom Level", newZoomLevel);
    setZoomLevel(newZoomLevel);
  };

  // 태스크 업데이트 핸들러 (새로운 manageTask 함수 사용)
  const handleTaskUpdate = (updatedTask) => {
    // console.log('Schedule handleTaskUpdate called with:', updatedTask);
    // console.log('Task ID:', updatedTask.id);
    // console.log('Start date:', updatedTask.start);
    // console.log('End date:', updatedTask.end);
    
    const currentTask = tasks.find(t => t.id === updatedTask.id);
    if (!currentTask) {
      console.error(`Task with ID ${updatedTask.id} not found`);
      return;
    }

    // 변경 사항 분석
    let hasMaturityChange = false;
    let hasDateChange = false;
    let hasProgressChange = false;
    let hasPriceChange = false;

    // 진척도에 따른 성숙도 자동 업데이트
    if (updatedTask.progress === 100 && updatedTask.maturity !== MaturityType.COMPLETED) {
      // console.log(`Task ${updatedTask.id} progress reached 100%, auto-completing`);
      updatedTask.maturity = MaturityType.COMPLETED;
      hasMaturityChange = true;
    }
    else if (updatedTask.progress > 0 && updatedTask.progress < 100) {
      if (updatedTask.maturity === MaturityType.DRAFT || updatedTask.maturity === MaturityType.PLANNED) {
        // console.log(`Task ${updatedTask.id} progress started (${updatedTask.progress}%), auto-starting`);
        updatedTask.maturity = MaturityType.IN_PROGRESS;
        hasMaturityChange = true;
      }
    }
    else if (updatedTask.progress === 0 && updatedTask.maturity === MaturityType.IN_PROGRESS) {
      // console.log(`Task ${updatedTask.id} progress reset to 0%, auto-resetting to draft`);
      updatedTask.maturity = MaturityType.DRAFT;
      hasMaturityChange = true;
    }
    
    // 변경 사항 감지
    const startChanged = currentTask.start.getTime() !== updatedTask.start.getTime();
    const endChanged = currentTask.end.getTime() !== updatedTask.end.getTime();
    hasDateChange = startChanged || endChanged;
    hasProgressChange = currentTask.progress !== updatedTask.progress;
    hasPriceChange = currentTask.price !== updatedTask.price;
    const maturityChanged = currentTask.maturity !== updatedTask.maturity || hasMaturityChange;

    // 로깅
    // if (hasDateChange) console.log(`Task ${updatedTask.id} date changed - start: ${startChanged}, end: ${endChanged}`);
    // if (hasProgressChange) console.log(`Task ${updatedTask.id} progress changed from ${currentTask.progress} to ${updatedTask.progress}`);
    // if (hasPriceChange) console.log(`Task ${updatedTask.id} price changed from ${currentTask.price} to ${updatedTask.price}`);
    // if (maturityChanged) console.log(`Task ${updatedTask.id} maturity changed from ${currentTask.maturity} to ${updatedTask.maturity}`);

    // manageTask.modify를 사용하여 태스크 업데이트
    // 이 함수는 이미 calculateProjectAndPhaseValues와 adjustTopLevelTaskDates를 호출함
    manageTask.modify(updatedTask.id, updatedTask);

    // 성숙도가 변경된 경우 추가 캐스케이드 업데이트
    if (maturityChanged) {
      // console.log('Applying maturity cascade update');
      setTasks(prevTasks => {
        const tasksAfterCascade = updateTaskMaturityWithCascade(prevTasks, updatedTask.id, updatedTask.maturity);
        return tasksAfterCascade.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
      });
    }

    // 날짜가 변경된 경우 상위 태스크 날짜 조정
    if (hasDateChange) {
      // console.log("Applying parent date updates");
      setTasks(prevTasks => {
        return updateAllParentTaskDates(prevTasks, updatedTask);
      });
    }
  };

  // 모든 하위 태스크를 재귀적으로 찾는 함수
  const getAllChildTasks = (tasks, parentId) => {
    const directChildren = tasks.filter(task => task.parent === parentId);
    let allChildren = [...directChildren];
    
    // 각 직접 하위 태스크의 하위 태스크들도 재귀적으로 찾기
    directChildren.forEach(child => {
      const grandChildren = getAllChildTasks(tasks, child.id);
      allChildren = [...allChildren, ...grandChildren];
    });
    
    // console.log(`getAllChildTasks for ${parentId}: found ${allChildren.length} children:`, allChildren.map(c => `${c.id}(${c.text})`));
    return allChildren;
  };

  // 모든 상위 태스크를 찾는 함수
  const getAllParentTasks = (tasks, childId) => {
    const parents = [];
    let currentTaskId = childId;
    
    while (currentTaskId && currentTaskId !== 0) {
      const currentTask = tasks.find(task => task.id === currentTaskId);
      if (!currentTask || currentTask.parent === 0) {
        break;
      }
      
      const parentTask = tasks.find(task => task.id === currentTask.parent);
      if (parentTask) {
        parents.push(parentTask);
        currentTaskId = parentTask.id;
      } else {
        break;
      }
    }
    
    // console.log(`getAllParentTasks for ${childId}:`, parents.map(p => `${p.id}(${p.text})`));
    return parents;
  };

  // 최상위 태스크의 날짜를 하위 태스크에 맞춰 조정하는 함수 (초기 로딩용)
  const adjustTopLevelTaskDates = (tasks) => {
    // 최상위 태스크 찾기
    const topLevelTask = tasks.find(task => task.parent === 0);
    if (!topLevelTask) {
      return tasks;
    }
    
    // 최상위 태스크의 모든 하위 태스크들을 재귀적으로 찾기
    const allChildTasks = getAllChildTasks(tasks, topLevelTask.id);
    
    if (allChildTasks.length === 0) {
      return tasks;
    }
    
    // console.log(" -> allChildTasks", allChildTasks);

    // 가장 이른 시작일과 가장 늦은 종료일 찾기
    const startDates = allChildTasks.map(task => new Date(task.start));
    const endDates = allChildTasks.map(task => new Date(task.end));
    
    const earliestStart = new Date(Math.min(...startDates.map(date => date.getTime())));
    const latestEnd = new Date(Math.max(...endDates.map(date => date.getTime())));
    
    // 최상위 태스크의 날짜 업데이트
    const updatedTopLevelTask = {
      ...topLevelTask,
      start: earliestStart,
      end: latestEnd,
      duration: Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24))
    };
    
    // console.log(`Initial top-level task date adjustment: start=${earliestStart.toDateString()}, end=${latestEnd.toDateString()}`);
    
    // 업데이트된 최상위 태스크로 교체
    return tasks.map(task => 
      task.id === topLevelTask.id ? updatedTopLevelTask : task
    );
  };

  // 모든 상위 태스크들의 날짜를 하위 태스크에 맞춰 업데이트하는 함수
  const updateAllParentTaskDates = (tasks, changedTask) => {
    // console.log('updateAllParentTaskDates called with:', changedTask);
    // console.log('Changed task start:', changedTask.start);
    // console.log('Changed task end:', changedTask.end);
    
    // 변경된 태스크가 최상위 태스크인 경우 조정 불필요
    if (changedTask.parent === 0) {
      // console.log('Top level task, no parent adjustment needed');
      return tasks;
    }
    
    // 이미 업데이트된 태스크 목록 사용 (changedTask가 이미 적용되어 있음)
    let updatedTasks = [...tasks];
    
    // 변경된 태스크의 ID를 기록하여 나중에 덮어쓰지 않도록 보호
    const originallyChangedTaskId = changedTask.id;
    
    // console.log('Preserving manually changed task:', originallyChangedTaskId);
    
    // 변경된 태스크의 모든 상위 태스크들을 찾기 (최신 태스크 목록 사용)
    const parentTasks = getAllParentTasks(updatedTasks, changedTask.id);
    
    if (parentTasks.length === 0) {
      return updatedTasks;
    }
    
    // console.log(`Found ${parentTasks.length} parent tasks to update:`, parentTasks.map(p => p.id));
    
    // 각 상위 태스크의 날짜를 업데이트 (하위부터 상위로)
    parentTasks.forEach((parentTask) => {
      // 최신 태스크 목록에서 해당 상위 태스크의 모든 하위 태스크들을 찾기
      const allChildTasks = getAllChildTasks(updatedTasks, parentTask.id);
      
      // console.log(`Parent task ${parentTask.id} has ${allChildTasks.length} child tasks`);
      
      if (allChildTasks.length > 0) {
        // 가장 이른 시작일과 가장 늦은 종료일 찾기
        const startDates = allChildTasks.map(task => new Date(task.start));
        const endDates = allChildTasks.map(task => new Date(task.end));
        
        const earliestStart = new Date(Math.min(...startDates.map(date => date.getTime())));
        const latestEnd = new Date(Math.max(...endDates.map(date => date.getTime())));
        
        // 상위 태스크의 날짜 업데이트 (프로젝트와 단계만)
        if (parentTask.type === 'project' || parentTask.type === 'phase') {
          const updatedParentTask = {
            ...parentTask,
            start: earliestStart,
            end: latestEnd,
            duration: Math.ceil((latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24))
          };
          
          // console.log(`Updating parent task ${parentTask.id} (${parentTask.type}) dates: start=${earliestStart.toDateString()}, end=${latestEnd.toDateString()}`);
          
          // 업데이트된 태스크 목록에 반영 (원래 변경된 태스크는 보호)
          updatedTasks = updatedTasks.map(task => {
            if (task.id === parentTask.id) {
              return updatedParentTask;
            }
            // 원래 수동으로 변경된 태스크는 절대 덮어쓰지 않음
            if (task.id === originallyChangedTaskId) {
              return changedTask; // 원래 수동 변경값 유지
            }
            return task;
          });
        }
      }
    });
    
    // console.log(`Final updated tasks count: ${updatedTasks.length}`);
    return updatedTasks;
  };

  // 종합 태스크 관리 함수 (CRUD 작업)
  const manageTask = {
    // 태스크 추가
    add: (parentId = null, taskData = {}) => {
      // 선택된 태스크가 있고 프로젝트나 단계 타입인 경우, 해당 태스크를 부모로 설정
      let actualParentId = parentId;
      if (!parentId && selectedTask && (selectedTask.type === "project" || selectedTask.type === "phase")) {
        actualParentId = selectedTask.id;
        // console.log(`Adding task as child of selected ${selectedTask.type}: ${selectedTask.text} (ID: ${selectedTask.id})`);
      } else if (parentId === null) {
        actualParentId = 0; // 최상위
      }

      const newTask = {
        id: Date.now() + Math.random(), // 고유 ID 생성
        text: taskData.text || "새 태스크",
        start: taskData.start || new Date(),
        end: taskData.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 일주일 후
        duration: taskData.duration || 7,
        progress: taskData.progress || 0,
        price: taskData.price || formatNumberWithCommas(0),
        price_ratio: taskData.price_ratio || 0,
        type: taskData.type || "task",
        subType: taskData.subType || TaskSubType.NORMAL,
        parent: actualParentId,
        maturity: taskData.maturity || MaturityType.DRAFT,
        ...taskData // 추가 속성 병합
      };

      // console.log("Adding new task:", newTask);
      
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        // 새 태스크가 추가된 후 프로젝트/단계 값들 재계산
        const calculatedTasks = calculateProjectAndPhaseValues(updatedTasks);
        const finalTasks = adjustTopLevelTaskDates(calculatedTasks);
        
        // 로컬 스토리지에 자동 저장 (useEffect의 자동저장과 중복을 피하기 위해 조건 추가)
        if (useLocalStorage && !autoSave) {
          saveTasksToLocal(finalTasks);
          updateStorageInfo();
        }
        
        return finalTasks;
      });
      
      return newTask;
    },

    // 태스크 수정
    modify: (taskId, updatedData) => {
      // console.log(`Modifying task ${taskId} with data:`, updatedData);
      
      setTasks(prevTasks => {
        const taskExists = prevTasks.find(t => t.id === taskId);
        if (!taskExists) {
          console.error(`Task with ID ${taskId} not found`);
          return prevTasks;
        }

        const updatedTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            const modifiedTask = { ...task, ...updatedData };
            // console.log("Modified task:", modifiedTask);
            return modifiedTask;
          }
          return task;
        });

        // 수정 후 프로젝트/단계 값들 재계산
        const calculatedTasks = calculateProjectAndPhaseValues(updatedTasks);
        const finalTasks = adjustTopLevelTaskDates(calculatedTasks);
        
        // 로컬 스토리지에 자동 저장
        if (useLocalStorage && !autoSave) {
          saveTasksToLocal(finalTasks);
          updateStorageInfo();
        }
        
        return finalTasks;
      });
    },

    // 태스크 삭제 (하위 태스크도 함께 삭제)
    delete: (taskId) => {
      // console.log(`Deleting task ${taskId} and all its children`);
      
      const deleteRecursively = (tasks, id) => {
        // 먼저 자식 태스크들 찾기
        const childrenToDelete = tasks.filter(task => task.parent === id);
        let result = tasks.filter(task => task.id !== id);
        
        // 각 자식 태스크도 재귀적으로 삭제
        for (const child of childrenToDelete) {
          result = deleteRecursively(result, child.id);
        }
        
        return result;
      };

      setTasks(prevTasks => {
        const taskExists = prevTasks.find(t => t.id === taskId);
        if (!taskExists) {
          console.error(`Task with ID ${taskId} not found`);
          return prevTasks;
        }

        // 삭제할 모든 태스크 (부모 + 하위) 찾기
        const getAllChildrenIds = (tasks, parentId) => {
          const children = tasks.filter(t => t.parent === parentId);
          let allIds = children.map(c => c.id);
          children.forEach(child => {
            allIds = [...allIds, ...getAllChildrenIds(tasks, child.id)];
          });
          return allIds;
        };

        const childrenIds = getAllChildrenIds(prevTasks, taskId);
        const allIdsToDelete = [taskId, ...childrenIds];
        // console.log(`Deleting tasks with IDs: ${allIdsToDelete.join(', ')}`);

        const remainingTasks = deleteRecursively(prevTasks, taskId);
        
        // 삭제 후 프로젝트/단계 값들 재계산
        const calculatedTasks = calculateProjectAndPhaseValues(remainingTasks);
        const finalTasks = adjustTopLevelTaskDates(calculatedTasks);
        
        // 로컬 스토리지에 자동 저장
        if (useLocalStorage && !autoSave) {
          saveTasksToLocal(finalTasks);
          updateStorageInfo();
        }
        
        return finalTasks;
      });

      // 삭제된 태스크가 선택되어 있으면 선택 해제
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
    },

    // 태스크 정보 조회
    get: (taskId) => {
      return tasks.find(task => task.id === taskId) || null;
    },

    // 하위 태스크들 조회
    getChildren: (parentId) => {
      return tasks.filter(task => task.parent === parentId);
    },

    // 상위 태스크 조회
    getParent: (taskId) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.parent || task.parent === 0) return null;
      return tasks.find(t => t.id === task.parent) || null;
    },

    // 전체 하위 태스크 트리 조회 (재귀적)
    getAllChildren: (parentId) => {
      const directChildren = tasks.filter(task => task.parent === parentId);
      let allChildren = [...directChildren];
      
      directChildren.forEach(child => {
        const grandChildren = manageTask.getAllChildren(child.id);
        allChildren = [...allChildren, ...grandChildren];
      });
      
      return allChildren;
    },

    // 태스크 이동 (부모 변경)
    move: (taskId, newParentId) => {
      // console.log(`Moving task ${taskId} to parent ${newParentId}`);
      
      setTasks(prevTasks => {
        const taskToMove = prevTasks.find(t => t.id === taskId);
        if (!taskToMove) {
          console.error(`Task with ID ${taskId} not found`);
          return prevTasks;
        }

        // 순환 참조 방지 - 자신이나 자신의 하위 태스크를 부모로 설정할 수 없음
        const getAllChildrenIds = (tasks, parentId) => {
          const children = tasks.filter(t => t.parent === parentId);
          let allIds = children.map(c => c.id);
          children.forEach(child => {
            allIds = [...allIds, ...getAllChildrenIds(tasks, child.id)];
          });
          return allIds;
        };

        const childrenIds = getAllChildrenIds(prevTasks, taskId);
        if (newParentId === taskId || childrenIds.includes(newParentId)) {
          console.error("Cannot move task: circular reference detected");
          return prevTasks;
        }

        const updatedTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, parent: newParentId };
          }
          return task;
        });

        // 이동 후 프로젝트/단계 값들 재계산
        const calculatedTasks = calculateProjectAndPhaseValues(updatedTasks);
        const finalTasks = adjustTopLevelTaskDates(calculatedTasks);
        
        // 로컬 스토리지에 자동 저장
        if (useLocalStorage && !autoSave) {
          saveTasksToLocal(finalTasks);
          updateStorageInfo();
        }
        
        return finalTasks;
      });
    }
  };

  // 태스크 선택 핸들러
  const handleTaskSelect = (task) => {
    // console.log("선택된 태스크:", task);
    setSelectedTask(task);
  };

  // 태스크 추가 핸들러 (새로운 manageTask 함수 사용)
  const handleTaskAdd = (parentId = null) => {
    const newTask = manageTask.add(parentId);
    
    // 새로 생성된 태스크를 바로 편집 모드로 전환
    setNewTaskIdForEdit(newTask.id);
  };

  // 태스크 삭제 핸들러 (새로운 manageTask 함수 사용)
  const handleTaskDelete = (taskId) => {
    // 하위 태스크가 있는지 확인
    const hasChildren = tasks.some(task => task.parent === taskId);
    
    if (hasChildren) {
      if (!window.confirm('하위 태스크가 있습니다. 모든 하위 태스크도 함께 삭제됩니다. 계속하시겠습니까?')) {
        return;
      }
    }
    
    manageTask.delete(taskId);
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    if (ganttRef.current && ganttRef.current.scrollToToday) {
      ganttRef.current.scrollToToday();
    }
  };

  return (
    <div style={{ height: "100vh", padding: "20px", backgroundColor: "#f5f5f5"}}>
      <h1 style={{ marginBottom: "20px", color: "#333" }}>
        🏗️ 공정표 관리 시스템
      </h1>
      
      {/* 컨트롤 버튼들 */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "20px",
        alignItems: "center",
        padding: "10px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <button 
          onClick={goToToday}
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          📅 오늘로 이동
        </button>
        
        <button 
          onClick={() => handleTaskAdd(null)}
          disabled={!selectedTask || (selectedTask.type !== "project" && selectedTask.type !== "phase")}
          style={{
            padding: "8px 16px",
            backgroundColor: (!selectedTask || (selectedTask.type !== "project" && selectedTask.type !== "phase")) 
              ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (!selectedTask || (selectedTask.type !== "project" && selectedTask.type !== "phase")) 
              ? "not-allowed" : "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            opacity: (!selectedTask || (selectedTask.type !== "project" && selectedTask.type !== "phase")) 
              ? 0.6 : 1
          }}
          title={selectedTask && (selectedTask.type === "project" || selectedTask.type === "phase") 
            ? `"${selectedTask.text}"의 하위 작업으로 추가` 
            : "프로젝트나 단계를 선택해주세요"}
        >
          + 하위 작업 추가
        </button>
        
        <button 
          onClick={() => setIsConnectionMode(!isConnectionMode)}
          style={{
            padding: "8px 16px",
            backgroundColor: isConnectionMode ? "#dc3545" : "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "5px"
          }}
          title={isConnectionMode ? "네트워크 연결 모드 종료" : "네트워크 연결 모드 시작"}
        >
          🔗 {isConnectionMode ? "연결 모드 종료" : "네트워크 연결하기"}
        </button>

        {/* 로컬 스토리지 컨트롤 */}
        <div style={{ 
          display: "flex", 
          gap: "5px", 
          alignItems: "center",
          marginLeft: "20px",
          padding: "5px 10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "6px",
          border: "1px solid #dee2e6"
        }}>
          <label style={{ fontSize: "12px", color: "#495057", display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="checkbox"
              checked={useLocalStorage}
              onChange={(e) => setUseLocalStorage(e.target.checked)}
            />
            로컬 저장
          </label>
          
          <label style={{ fontSize: "12px", color: "#495057", display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              disabled={!useLocalStorage}
            />
            자동저장
          </label>

          <button
            onClick={handleSaveToLocal}
            disabled={!useLocalStorage}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: useLocalStorage ? "#007bff" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: useLocalStorage ? "pointer" : "not-allowed",
            }}
            title="현재 태스크를 로컬 스토리지에 저장"
          >
            💾 저장
          </button>

          <button
            onClick={handleLoadFromLocal}
            disabled={!useLocalStorage}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: useLocalStorage ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: useLocalStorage ? "pointer" : "not-allowed",
            }}
            title="로컬 스토리지에서 태스크 불러오기"
          >
            📁 불러오기
          </button>

          <button
            onClick={handleExportTasks}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            title="태스크를 JSON 파일로 내보내기"
          >
            📤 내보내기
          </button>

          <label style={{
            padding: "4px 8px",
            fontSize: "11px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            display: "inline-block"
          }}>
            📥 가져오기
            <input
              type="file"
              accept=".json"
              onChange={handleImportTasks}
              style={{ display: "none" }}
            />
          </label>

          <button
            onClick={handleClearLocal}
            disabled={!useLocalStorage}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: useLocalStorage ? "#dc3545" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: useLocalStorage ? "pointer" : "not-allowed",
            }}
            title="로컬 스토리지 초기화"
          >
            🗑️ 초기화
          </button>

          {storageInfo && (
            <span style={{ 
              fontSize: "10px", 
              color: "#6c757d",
              marginLeft: "5px"
            }}>
              ({storageInfo.tasksCount}개 저장됨)
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "#666" }}>줌 레벨:</span>
          {["year", "quarter", "month", "week", "day"].map(level => (
            <button
              key={level}
              onClick={() => handleZoomChange(level)}
              style={{
                padding: "6px 12px",
                backgroundColor: zoomLevel === level ? "#007bff" : "#f8f9fa",
                color: zoomLevel === level ? "white" : "#333",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              {level === "year" && "연도"}
              {level === "quarter" && "분기"}
              {level === "month" && "월"}
              {level === "week" && "주"}
              {level === "day" && "일"}
            </button>
          ))}
        </div>

        <div style={{ 
          marginLeft: "auto", 
          fontSize: "12px", 
          color: "#666",
          backgroundColor: "#e9ecef",
          padding: "5px 10px",
          borderRadius: "4px"
        }}>
          현재: {zoomLevel === "year" && "연도 보기"}
          {zoomLevel === "quarter" && "분기 보기"}
          {zoomLevel === "month" && "월 보기"}
          {zoomLevel === "week" && "주 보기"}
          {zoomLevel === "day" && "일 보기"}
        </div>
      </div>
      
      {/* 간트차트 */}
      <div style={{ 
        flex: 1, 
        height: "calc(100vh - 200px)",
        ///border: "2px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        <CustomGantt 
          ref={ganttRef}
          tasks={tasks} 
          columns={columns}
          scales={scales} 
          markers={markers}
          cellWidth={getCellWidthForZoom(zoomLevel)}
          rowHeight={getRowHeightForZoom(zoomLevel)}
          onTaskUpdate={handleTaskUpdate}
          onTaskSelect={handleTaskSelect}
          onTaskAdd={handleTaskAdd}
          onTaskDelete={handleTaskDelete}
          zoomLevel={zoomLevel}
          newTaskIdForEdit={newTaskIdForEdit}
          onNewTaskEditComplete={() => setNewTaskIdForEdit(null)}
          taskManager={manageTask}
          connections={connections}
          onConnectionCreate={handleConnectionCreate}
          onConnectionDelete={handleConnectionDelete}
          isConnectionMode={isConnectionMode}
        />
      </div>
    </div>
  );    
};

export default Schedule;
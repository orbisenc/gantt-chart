// Note: formatNumberWithCommas is defined locally in Schedule.jsx, so we'll use a local implementation
const formatNumberWithCommas = (number) => {
  if (number == null || number === '') return '';
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
import { MaturityType, TaskSubType } from '../utils/types';

/**
 * 새로운 계층 구조 규칙을 따르는 초기 태스크 데이터
 * 
 * 계층 구조 규칙:
 * 1. Project (parent: 0) - 최상위 프로젝트, Phase와 Milestone만 자식으로 가질 수 있음
 * 2. Phase (parent: Project) - 단계, 일반태스크만 자식으로 가질 수 있음  
 * 3. 일반태스크 (parent: Phase) - 실제 작업, 자식 없음
 * 4. Milestone (parent: Project with parent: 0) - 마일스톤, 최상위 프로젝트에만 속함
 */
export const initialTasks = [
  // 1. 최상위 프로젝트
  {
    id: 1,
    text: "영월 봉래산 전망시설 조성사업 건축공사",
    start: new Date(2025, 0, 1),
    end: new Date(2025, 11, 31),
    duration: 365,
    progress: 0, // 자동 계산될 예정 (하위 태스크들의 평균)
    price: formatNumberWithCommas(12800000000),
    assignee: "프로젝트",
    price_ratio: 100,
    type: "project",
    parent: 0,
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 10,
    text: "가설공사",
    start: new Date(2025, 0, 1),
    end: new Date(2025, 2, 31),
    duration: 90,
    progress: 0,
    price: formatNumberWithCommas(480000000),
    assignee: "건축",
    price_ratio: 3.75,
    parent: 1,
    type: "phase",
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 11,
    text: "규준틀 설치",
    start: new Date(2025, 0, 1),
    end: new Date(2025, 0, 31),
    duration: 31,
    progress: 100,
    price: formatNumberWithCommas(120000000),
    assignee: "김건축",
    price_ratio: 0.94,
    parent: 10, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.COMPLETED,
  },
  {
    id: 12,
    text: "시스템비계 설치 ",
    start: new Date(2025, 1, 1),
    end: new Date(2025, 1, 28),
    duration: 28,
    progress: 75,
    price: formatNumberWithCommas(280000000),
    assignee: "이토공",
    price_ratio: 2.19,
    parent: 10, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.IN_PROGRESS,
  },
  {
    id: 13,
    text: "시스템비계 해체",
    start: new Date(2025, 2, 1),
    end: new Date(2025, 2, 31),
    duration: 31,
    progress: 25,
    price: formatNumberWithCommas(80000000),
    assignee: "박철근",
    price_ratio: 0.63,
    parent: 10, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 20,
    text: "철근콘크리트공사",
    start: new Date(2025, 2, 1),
    end: new Date(2025, 4, 31),
    duration: 90,
    progress: 0,
    price: formatNumberWithCommas(2560000000),
    assignee: "토목",
    price_ratio: 20,
    parent: 1,
    type: "phase",
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 21,
    text: "기초골조",
    start: new Date(2025, 2, 1),
    end: new Date(2025, 2, 31),
    duration: 31,
    progress: 75,
    price: formatNumberWithCommas(320000000),
    assignee: "최토공",
    price_ratio: 2.5,
    parent: 20, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.IN_PROGRESS,
  },
  {
    id: 22,
    text: "1층 골조",
    start: new Date(2025, 3, 1),
    end: new Date(2025, 3, 20),
    duration: 20,
    progress: 0,
    price: formatNumberWithCommas(640000000),
    assignee: "정기초",
    price_ratio: 5,
    parent: 20, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 23,
    text: "옥상 무근 타설",
    start: new Date(2025, 3, 21),
    end: new Date(2025, 4, 10),
    duration: 20,
    progress: 0,
    price: formatNumberWithCommas(960000000),
    assignee: "한자재",
    price_ratio: 7.5,
    parent: 20, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 30,
    text: "철골공사",
    start: new Date(2025, 4, 15), // May 15 - July 31 (하위 태스크 범위에 맞춤)
    end: new Date(2025, 6, 31),
    duration: 78,
    progress: 0,
    price: formatNumberWithCommas(3840000000),
    assignee: "체험관팀장",
    price_ratio: 30,
    parent: 1,
    type: "phase",
    maturity: MaturityType.DRAFT,
  },
  
  {
    id: 31,
    text: "지하골조",
    start: new Date(2025, 4, 15),
    end: new Date(2025, 5, 14), // May 15 - June 14 (1개월)
    duration: 31,
    progress: 0,
    price: formatNumberWithCommas(1280000000),
    assignee: "강포장",
    price_ratio: 10,
    parent: 30, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 32,
    text: "2층 골조",
    start: new Date(2025, 5, 15), // June 15 - July 14 (1개월) 
    end: new Date(2025, 6, 14),
    duration: 30,
    progress: 0,
    price: formatNumberWithCommas(1920000000),
    assignee: "윤배수",
    price_ratio: 15,
    parent: 30, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },

  {
    id: 40,
    text: "창호 공사",
    start: new Date(2025, 7, 1), // Aug 1 - Oct 31 (하위 태스크 범위에 맞춤)
    end: new Date(2025, 9, 31),
    duration: 92,
    progress: 0,
    price: formatNumberWithCommas(3840000000),
    assignee: "내부공사팀장",
    price_ratio: 30,
    parent: 1,
    type: "phase",
    maturity: MaturityType.DRAFT,
  },
  {
    id: 41,
    text: "문틀설치",
    start: new Date(2025, 7, 1), // Aug 1 - Aug 31 (1개월)
    end: new Date(2025, 7, 31),
    duration: 31,
    progress: 0,
    price: formatNumberWithCommas(1280000000),
    assignee: "임철근",
    price_ratio: 10,
    parent: 40, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 42,
    text: "외부 커튼월 설치",
    start: new Date(2025, 8, 1), // Sep 1 - Sep 30 (1개월)
    end: new Date(2025, 8, 30),
    duration: 30,
    progress: 0,
    price: formatNumberWithCommas(1920000000),
    assignee: "서조적",
    price_ratio: 15,
    parent: 40, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 43,
    text: "각종 문짝 설치",
    start: new Date(2025, 9, 1), // Oct 1 - Oct 31 (1개월)
    end: new Date(2025, 9, 31),
    duration: 31,
    progress: 0,
    price: formatNumberWithCommas(640000000),
    assignee: "황타일",
    price_ratio: 5,
    parent: 40, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  
  // 6. Phase 5: 기계설비공사
  {
    id: 50,
    text: "품질시험비",
    start: new Date(2025, 10, 1),
    end: new Date(2025, 11, 31),
    duration: 61,
    progress: 0,
    price: formatNumberWithCommas(1280000000),
    assignee: "관리",
    price_ratio: 10,
    parent: 1,
    type: "phase",
    maturity: MaturityType.DRAFT,
  },
  
  // 6-1. 기계설비공사 하위 일반태스크 (현재는 없지만 예시로 하나 추가)
  {
    id: 51,
    text: "체험관 철골 샾 작성 및 승인",
    start: new Date(2025, 10, 1),
    end: new Date(2025, 10, 31),
    duration: 31,
    progress: 0,
    price: formatNumberWithCommas(640000000),
    assignee: "공조전문가",
    price_ratio: 5,
    parent: 50, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 52,
    text: "체험관 철골 설치",
    start: new Date(2025, 11, 1),
    end: new Date(2025, 11, 31),
    duration: 31,
    progress: 0,
    price: formatNumberWithCommas(640000000),
    assignee: "전기기사",
    price_ratio: 5,
    parent: 50, // Phase에 속함
    type: "task",
    subType: TaskSubType.NORMAL,
    maturity: MaturityType.DRAFT,
  },
  
  // 7. 프로젝트 레벨 마일스톤들 (최상위 프로젝트에만 속함)
  {
    id: 90,
    text: "설계 완료",
    start: new Date(2025, 2, 31),
    end: new Date(2025, 2, 31),
    duration: 0,
    progress: 0,
    price: 0,
    assignee: "설계팀",
    price_ratio: 0,
    parent: 1, // 최상위 프로젝트에 속함
    type: "task",
    subType: TaskSubType.MILESTONE,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 91,
    text: "기초공사 완료",
    start: new Date(2025, 4, 31),
    end: new Date(2025, 4, 31),
    duration: 0,
    progress: 0,
    price: 0,
    assignee: "기초팀",
    price_ratio: 0,
    parent: 1, // 최상위 프로젝트에 속함
    type: "task",
    subType: TaskSubType.MILESTONE,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 92,
    text: "체험관 구조 완료",
    start: new Date(2025, 7, 31),
    end: new Date(2025, 7, 31),
    duration: 0,
    progress: 0,
    price: 0,
    assignee: "구조팀",
    price_ratio: 0,
    parent: 1, // 최상위 프로젝트에 속함
    type: "task",
    subType: TaskSubType.MILESTONE,
    maturity: MaturityType.DRAFT,
  },
  {
    id: 93,
    text: "프로젝트 완료",
    start: new Date(2025, 11, 31),
    end: new Date(2025, 11, 31),
    duration: 0,
    progress: 0,
    price: 0,
    assignee: "전체팀",
    price_ratio: 0,
    parent: 1, // 최상위 프로젝트에 속함
    type: "task",
    subType: TaskSubType.MILESTONE,
    maturity: MaturityType.DRAFT,
  },
];

export default initialTasks;
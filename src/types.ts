export interface Poem {
  title: string;
  author: string;
  /** 시의 각 행. 빈 문자열("")은 연 구분을 뜻한다. */
  lines: string[];
}

export interface OverallResult {
  paraphrase: string; // 전체 내용 풀이
  mood: string; // 분위기·어조
  feedback: string; // 학생 첫인상에 대한 피드백
}

export type Verdict = "good" | "partial" | "retry";

export interface StepFeedback {
  verdict: Verdict;
  feedback: string;
  modelAnswer: string;
}

export interface ClinicTarget {
  name: string;
  sign: "+" | "-" | "";
}

export interface ClinicAnswers {
  speaker: string; // 1. 화자 상태
  targets: ClinicTarget[]; // 2. 대상 +/-
  targetNote: string;
  conclusion: string; // 3. 감정·생각 결론
  message: string; // 4. 시인이 하고자 하는 말
}

export interface ClinicState {
  answers: ClinicAnswers;
  feedback: Partial<Record<ClinicStepKey, StepFeedback>>;
}

export type ClinicStepKey = "speaker" | "targets" | "conclusion" | "message";

export interface LineAnalysis {
  index: number; // poem.lines 기준 인덱스
  techniques: string[];
  explanation: string;
}

export interface LinesState {
  analysis: LineAnalysis[];
  picks: Record<number, string[]>;
  notes: Record<number, string>;
  revealed: Record<number, boolean>;
}

export interface OverviewResult {
  genre: string;
  character: string;
  subject: string;
  theme: string;
  rhythm: string;
  tone: string;
  structure: string;
  features: string[];
  examPoints: string[];
}

export interface Progress {
  firstImpression?: string;
  overall?: OverallResult;
  clinic?: ClinicState;
  lines?: LinesState;
  overview?: OverviewResult;
}

export interface Work extends Poem {
  id: string;
  createdAt?: number;
  progress?: Progress;
}

export const TECHNIQUES = [
  "반어",
  "역설",
  "직유",
  "은유",
  "의인",
  "활유",
  "대유",
  "상징",
  "대구",
  "반복",
  "열거",
  "설의",
  "영탄",
  "도치",
  "명령·청유",
  "시각적 이미지",
  "청각적 이미지",
  "촉각적 이미지",
  "공감각",
  "색채 대비",
  "수미상관",
  "음성 상징어",
  "동일 시어 반복",
  "특별한 기법 없음",
] as const;

export const SAMPLE_WORK: Work = {
  id: "sample",
  title: "진달래꽃",
  author: "김소월",
  lines: [
    "나 보기가 역겨워 가실 때에는",
    "말없이 고이 보내 드리오리다",
    "",
    "영변에 약산 진달래꽃",
    "아름 따다 가실 길에 뿌리오리다",
    "",
    "가시는 걸음걸음 놓인 그 꽃을",
    "사뿐히 즈려밟고 가시옵소서",
    "",
    "나 보기가 역겨워 가실 때에는",
    "죽어도 아니 눈물 흘리오리다",
  ],
};

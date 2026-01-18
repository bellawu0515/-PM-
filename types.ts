
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type TaskStatus = 'open' | 'done';

export interface TaskClassification {
  id: string;
  originalText: string;
  quadrant: Quadrant;
  quadrantLabel: string;
  uScore: number;
  iScore: number;
  dueAt: number | null; // Timestamp
  status: TaskStatus;
  completedAt: number | null; // Timestamp
  explanation: {
    urgency: string;
    importance: string;
    nextAction: string; // Used as Execution Suggestion
  };
  timestamp: number;
}

export interface GeminiClassificationResult {
  quadrant: string;
  u: number;
  i: number;
  explanation: {
    urgency: string;
    importance: string;
    nextAction: string;
  };
}

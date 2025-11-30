export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  image: string; // Base64 string
  registeredAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  role: string;
  timestamp: string;
  status: 'Present' | 'Late';
  confidence: number;
}

export interface RecognitionResult {
  matches: Array<{
    userId: string;
    confidence: number;
  }>;
  reasoning?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  REGISTER = 'REGISTER',
  ATTENDANCE = 'ATTENDANCE',
  HISTORY = 'HISTORY'
}
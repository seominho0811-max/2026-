
export interface SusiData {
  id: string;
  studentName: string;
  region: string;
  university: string;
  admissionType: string;
  major: string;
  grade: number;
  result: string;
  raw: any[];
}

export interface DashboardStats {
  totalApps: number;
  passCount: number;
  passRate: number;
  avgGrade: number;
  universityCounts: { name: string; value: number }[];
  resultDistribution: { name: string; value: number }[];
  admissionTypeDist: { name: string; value: number }[];
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
  keyFindings: string[];
}

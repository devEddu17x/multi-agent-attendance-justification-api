export interface ScheduleAttendanceResult {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    documentNumber: string;
  };
  attendance: {
    id: string;
    date: string;
    checkInTime: string;
    status: string;
    confidenceScore: number;
  } | null;
}

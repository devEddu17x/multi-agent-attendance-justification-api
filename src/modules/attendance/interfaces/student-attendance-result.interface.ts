export interface StudentAttendanceResult {
  id: string;
  date: string;
  checkInTime: string;
  status: string;
  course: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  schedule: {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  };
}

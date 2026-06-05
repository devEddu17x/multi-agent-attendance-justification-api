export interface TeacherScheduleResult {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  classroom: {
    id: string;
    name: string;
    building: string;
  };
}

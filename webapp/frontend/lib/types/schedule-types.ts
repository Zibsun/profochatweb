// Types for schedule functionality

export interface CourseSection {
  elementId: string;
  title: string;
}

export interface ScheduleSection {
  elementId: string;
  title: string;
  startTime: string | null; // ISO 8601 UTC or null
  status: 'scheduled' | 'immediate';
  isDeleted: boolean; // true if section not in course anymore
}

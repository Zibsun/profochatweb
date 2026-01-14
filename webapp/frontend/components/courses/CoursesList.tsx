'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Trash2,
  Copy,
  Loader2,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Bot {
  bot_id: number;
  bot_name: string;
  display_name?: string;
}

interface Course {
  course_id: number;
  course_code: string;
  title?: string;
  description?: string;
  bots: Bot[];
}

interface CoursesResponse {
  courses: Course[];
}

export function CoursesList() {
  const { toast } = useToast();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [duplicatingCourseId, setDuplicatingCourseId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    courseId: string;
    courseTitle: string;
  } | null>(null);
  const [showDeleteError, setShowDeleteError] = useState<{
    message: string;
    bots: string[];
  } | null>(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/v1/courses');
      if (!response.ok) {
        throw new Error(`Failed to load courses: ${response.statusText}`);
      }
      const data: CoursesResponse = await response.json();
      setCourses(data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete = async (courseId: string, courseTitle: string) => {
    setShowDeleteConfirm({ courseId, courseTitle });
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    const { courseId } = showDeleteConfirm;
    setDeletingCourseId(courseId);
    setShowDeleteConfirm(null);

    try {
      const response = await fetch(`/api/v1/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.bots) {
          // Course has deployments
          setShowDeleteError({
            message: errorData.message,
            bots: errorData.bots,
          });
        } else {
          throw new Error(errorData.message || 'Failed to delete course');
        }
        return;
      }

      toast({
        title: 'Course deleted',
        description: `Course "${courseId}" has been deleted successfully.`,
      });

      await loadCourses();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete course',
        variant: 'destructive',
      });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleDuplicate = async (courseId: string) => {
    setDuplicatingCourseId(courseId);

    try {
      const response = await fetch(`/api/v1/courses/${courseId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate course');
      }

      const data = await response.json();
      
      toast({
        title: 'Course duplicated',
        description: `Course "${courseId}" has been duplicated successfully.`,
      });

      // Redirect to the new course editor
      router.push(`/course-editor/${data.course_code}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to duplicate course',
        variant: 'destructive',
      });
      setDuplicatingCourseId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Error loading courses</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadCourses}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 editor-root">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground mt-1">Manage your courses</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadCourses}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Link
              href="/course-editor"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </Link>
          </div>
        </div>

        {/* Courses Table */}
        {courses.length === 0 ? (
          <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No courses yet. Create your first course to get started.</p>
            <Link
              href="/course-editor"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </Link>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Course Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Connected Bots
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {courses.map((course) => (
                    <tr key={course.course_code} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/course-editor/${course.course_code}`}
                          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                          title="Click to edit course"
                        >
                          {course.title || course.course_code}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {course.bots.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No bots connected</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {course.bots.map((bot) => (
                              <Link
                                key={bot.bot_id}
                                href={`/bots?botId=${bot.bot_id}`}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200 transition-colors"
                              >
                                {bot.display_name || bot.bot_name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDuplicate(course.course_code)}
                            disabled={duplicatingCourseId === course.course_code}
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Duplicate course"
                          >
                            {duplicatingCourseId === course.course_code ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(course.course_code, course.title || course.course_code)}
                            disabled={deletingCourseId === course.course_code}
                            className="text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete course"
                          >
                            {deletingCourseId === course.course_code ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <div
              className="bg-card rounded-xl shadow-2xl w-[90%] max-w-md p-6 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">Delete Course</h2>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete this course? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Error Modal */}
        {showDeleteError && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteError(null)}
          >
            <div
              className="bg-card rounded-xl shadow-2xl w-[90%] max-w-md p-6 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground mb-2">Cannot Delete Course</h2>
                  <p className="text-muted-foreground mb-3">{showDeleteError.message}</p>
                  {showDeleteError.bots.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-foreground mb-2">Connected bots:</p>
                      <div className="flex flex-wrap gap-2">
                        {showDeleteError.bots.map((botName) => (
                          <span
                            key={botName}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200"
                          >
                            {botName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowDeleteError(null)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDeleteError(null)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

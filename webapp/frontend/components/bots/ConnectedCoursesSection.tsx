"use client"

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { ConnectedCourse } from "./types";
import { useToast } from "@/hooks/use-toast";

interface ConnectedCoursesSectionProps {
  courses: ConnectedCourse[];
  botId?: string;
  onAddCourse: () => void;
  onCourseRemoved?: () => void;
  onCourseUpdated?: () => void;
}

export function ConnectedCoursesSection({
  courses,
  botId,
  onAddCourse,
  onCourseRemoved,
  onCourseUpdated,
}: ConnectedCoursesSectionProps) {
  const [removingCourseId, setRemovingCourseId] = useState<string | null>(null);
  const [updatingCourseId, setUpdatingCourseId] = useState<string | null>(null);
  const [localCourses, setLocalCourses] = useState<ConnectedCourse[]>(courses);
  const { toast } = useToast();

  // Синхронизируем локальное состояние с пропсами
  useEffect(() => {
    setLocalCourses(courses);
  }, [courses]);

  const handleRemoveCourse = async (courseId: string) => {
    if (!botId) {
      toast({
        title: "Error",
        description: "Bot ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to detach "${courses.find(c => c.id === courseId)?.title || courseId}" from this bot?`)) {
      return;
    }

    setRemovingCourseId(courseId);

    try {
      const response = await fetch(`/api/bots/${botId}/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to detach course");
      }

      toast({
        title: "Course detached",
        description: "Course has been successfully detached from the bot",
      });

      // Вызываем callback для обновления списка курсов
      if (onCourseRemoved) {
        onCourseRemoved();
      }
    } catch (error) {
      console.error("Error removing course:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to detach course",
        variant: "destructive",
      });
    } finally {
      setRemovingCourseId(null);
    }
  };

  const handleToggleActive = async (courseId: string, newIsActive: boolean) => {
    if (!botId) {
      toast({
        title: "Error",
        description: "Bot ID is missing",
        variant: "destructive",
      });
      return;
    }

    setUpdatingCourseId(courseId);

    // Сохраняем предыдущее состояние для отката
    const previousCourses = [...localCourses];

    // Оптимистичное обновление UI
    setLocalCourses(prevCourses =>
      prevCourses.map(course =>
        course.id === courseId ? { ...course, is_active: newIsActive } : course
      )
    );

    try {
      const response = await fetch(`/api/bots/${botId}/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: newIsActive }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update course status");
      }

      // Вызываем callback для обновления списка курсов
      if (onCourseUpdated) {
        onCourseUpdated();
      }
    } catch (error) {
      console.error("Error updating course status:", error);
      // Откатываем оптимистичное обновление
      setLocalCourses(previousCourses);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update course status",
        variant: "destructive",
      });
    } finally {
      setUpdatingCourseId(null);
    }
  };

  const handleChangeEnvironment = async (courseId: string, newEnvironment: string) => {
    if (!botId) {
      toast({
        title: "Error",
        description: "Bot ID is missing",
        variant: "destructive",
      });
      return;
    }

    setUpdatingCourseId(courseId);

    // Сохраняем предыдущее состояние для отката
    const previousCourses = [...localCourses];
    const previousEnvironment = previousCourses.find(c => c.id === courseId)?.environment || "prod";

    // Оптимистичное обновление UI
    setLocalCourses(prevCourses =>
      prevCourses.map(course =>
        course.id === courseId ? { ...course, environment: newEnvironment } : course
      )
    );

    try {
      const response = await fetch(`/api/bots/${botId}/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ environment: newEnvironment }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update course environment");
      }

      // Вызываем callback для обновления списка курсов
      if (onCourseUpdated) {
        onCourseUpdated();
      }
    } catch (error) {
      console.error("Error updating course environment:", error);
      // Откатываем оптимистичное обновление
      setLocalCourses(prevCourses =>
        prevCourses.map(course =>
          course.id === courseId ? { ...course, environment: previousEnvironment } : course
        )
      );
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update course environment",
        variant: "destructive",
      });
    } finally {
      setUpdatingCourseId(null);
    }
  };

  const environmentOptions = ["prod", "staging", "dev", "test"];

  // Используем локальное состояние для отображения
  const displayCourses = localCourses;

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Connected Courses
        </h3>
      </div>

      {displayCourses.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">
          No courses connected yet.
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Environment</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Active</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayCourses.map((course) => (
                <tr
                  key={course.id}
                  className="border-t border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-2 text-foreground">
                    <span className="truncate block max-w-xs">{course.title}</span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={course.environment || "prod"}
                      onChange={(e) => handleChangeEnvironment(course.id, e.target.value)}
                      disabled={updatingCourseId === course.id}
                      className="w-full px-2 py-1 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {environmentOptions.map((env) => (
                        <option key={env} value={env}>
                          {env}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={course.is_active ?? true}
                        onChange={(e) => handleToggleActive(course.id, e.target.checked)}
                        disabled={updatingCourseId === course.id}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                    </label>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleRemoveCourse(course.id)}
                      disabled={removingCourseId === course.id}
                      className="p-1 hover:bg-destructive/10 rounded transition-all disabled:opacity-50"
                      title="Detach course"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={onAddCourse}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors mt-2"
      >
        <Plus className="w-3.5 h-3.5" />
        Add course
      </button>
    </div>
  );
}

"use client"

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ConnectedCourse } from "./types";
import { useToast } from "@/hooks/use-toast";

interface ConnectedCoursesSectionProps {
  courses: ConnectedCourse[];
  botId?: string;
  onAddCourse: () => void;
  onCourseRemoved?: () => void;
}

export function ConnectedCoursesSection({
  courses,
  botId,
  onAddCourse,
  onCourseRemoved,
}: ConnectedCoursesSectionProps) {
  const [removingCourseId, setRemovingCourseId] = useState<string | null>(null);
  const { toast } = useToast();

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

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Connected Courses
        </h3>
      </div>

      <div className="space-y-2">
        {courses.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No courses connected yet.
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 rounded-md text-sm text-foreground group"
            >
              <span className="flex-1 truncate">{course.title}</span>
              <button
                onClick={() => handleRemoveCourse(course.id)}
                disabled={removingCourseId === course.id}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all disabled:opacity-50"
                title="Detach course"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))
        )}

        <button
          onClick={onAddCourse}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          Add course
        </button>
      </div>
    </div>
  );
}

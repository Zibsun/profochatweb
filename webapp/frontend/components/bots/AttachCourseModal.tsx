"use client"

import { useState, useEffect } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  course_id: string;
  title: string;
  description?: string;
  date_created?: string;
  updated_at?: string;
}

interface AttachCourseModalProps {
  isOpen: boolean;
  botId: string;
  connectedCourseIds: string[];
  onClose: () => void;
  onAttach: (courseIds: string[]) => Promise<void>;
  onCreateCourse?: () => void;
}

export function AttachCourseModal({
  isOpen,
  botId,
  connectedCourseIds,
  onClose,
  onAttach,
  onCreateCourse,
}: AttachCourseModalProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Загружаем доступные курсы при открытии модального окна
  useEffect(() => {
    if (!isOpen || !botId) return;

    const loadAvailableCourses = async () => {
      setLoading(true);
      setError(null);
      setSelectedCourseIds(new Set());

      try {
        const response = await fetch(`/api/bots/${botId}/available-courses`);
        if (!response.ok) {
          throw new Error("Failed to load courses");
        }

        const data = await response.json();
        setCourses(data.courses || []);
      } catch (err) {
        console.error("Error loading courses:", err);
        setError(err instanceof Error ? err.message : "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    loadAvailableCourses();
  }, [isOpen, botId]);

  // Обработка ESC и клика вне модального окна
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !attaching) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, attaching, onClose]);

  const handleToggleCourse = (courseId: string) => {
    const newSelection = new Set(selectedCourseIds);
    if (newSelection.has(courseId)) {
      newSelection.delete(courseId);
    } else {
      newSelection.add(courseId);
    }
    setSelectedCourseIds(newSelection);
  };

  const handleAttach = async () => {
    if (selectedCourseIds.size === 0) {
      toast({
        title: "No courses selected",
        description: "Please select at least one course to attach",
        variant: "destructive",
      });
      return;
    }

    setAttaching(true);
    try {
      await onAttach(Array.from(selectedCourseIds));
      toast({
        title: "Courses attached",
        description: `Successfully attached ${selectedCourseIds.size} course(s) to the bot`,
      });
      onClose();
    } catch (err) {
      console.error("Error attaching courses:", err);
      toast({
        title: "Failed to attach courses",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setAttaching(false);
    }
  };

  const handleClose = () => {
    if (attaching) return;
    setSelectedCourseIds(new Set());
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-start justify-between shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">Attach Course</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select which course(s) to connect to this bot
            </p>
          </div>
          {!attaching && (
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-muted transition-colors ml-4"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-foreground">Loading courses...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">Error loading courses</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  const loadCourses = async () => {
                    setLoading(true);
                    try {
                      const response = await fetch(`/api/bots/${botId}/available-courses`);
                      if (!response.ok) throw new Error("Failed to load courses");
                      const data = await response.json();
                      setCourses(data.courses || []);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to load courses");
                    } finally {
                      setLoading(false);
                    }
                  };
                  loadCourses();
                }}
                className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No available courses to attach. Create a new course first.
              </p>
              {onCreateCourse && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateCourse();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Course
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {courses.map((course) => {
                const isSelected = selectedCourseIds.has(course.course_id);
                return (
                  <label
                    key={course.course_id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary/30"
                        : "bg-background border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleCourse(course.course_id)}
                      className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {course.title || course.course_id}
                      </div>
                      {course.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {course.description}
                        </div>
                      )}
                      {(course.updated_at || course.date_created) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {course.updated_at 
                            ? `Updated: ${new Date(course.updated_at).toLocaleDateString()}`
                            : course.date_created 
                            ? `Created: ${new Date(course.date_created).toLocaleDateString()}`
                            : null}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border flex items-center justify-between shrink-0">
          <div className="text-sm text-muted-foreground">
            {selectedCourseIds.size > 0 && (
              <span>{selectedCourseIds.size} course(s) selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={attaching}
              className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAttach}
              disabled={attaching || selectedCourseIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {attaching && <Loader2 className="w-4 h-4 animate-spin" />}
              Attach
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

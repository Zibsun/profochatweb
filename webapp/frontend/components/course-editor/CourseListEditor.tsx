'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Database, 
  FileText, 
  Edit, 
  Plus, 
  RefreshCw, 
  AlertCircle,
  ExternalLink,
  Trash2,
  X,
  Save
} from 'lucide-react';

interface CourseMetadata {
  course_id: string;
  path: string;
  element?: string;
  restricted?: boolean | string;
  decline_text?: string;
  ban_enabled?: boolean | string;
  ban_text?: string;
  is_from_db?: boolean;
  is_from_ext_courses?: boolean;
}

interface CoursesResponse {
  courses: CourseMetadata[];
  ext_courses?: {
    enabled: boolean;
    source: string;
    note: string;
  } | null;
}

export function CourseListEditor() {
  const [courses, setCourses] = useState<CourseMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extCoursesInfo, setExtCoursesInfo] = useState<CoursesResponse['ext_courses']>(null);
  const [editingCourse, setEditingCourse] = useState<CourseMetadata | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<CourseMetadata>>({});

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/course-editor/courses');
      if (!response.ok) {
        throw new Error(`Failed to load courses: ${response.statusText}`);
      }
      const data: CoursesResponse = await response.json();
      setCourses(data.courses);
      setExtCoursesInfo(data.ext_courses || null);
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

  const handleEditMetadata = async (courseId: string) => {
    const course = courses.find(c => c.course_id === courseId);
    if (!course) return;
    
    setEditingCourse(course);
    setFormData({
      path: course.path,
      element: course.element || '',
      restricted: course.restricted,
      decline_text: course.decline_text || '',
      ban_enabled: course.ban_enabled,
      ban_text: course.ban_text || '',
    });
  };

  const handleSaveMetadata = async () => {
    if (!editingCourse) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/course-editor/courses/${editingCourse.course_id}/metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: formData.path,
          element: formData.element || undefined,
          restricted: formData.restricted,
          decline_text: formData.decline_text || undefined,
          ban_enabled: formData.ban_enabled,
          ban_text: formData.ban_text || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save metadata');
      }

      setEditingCourse(null);
      setFormData({});
      await loadCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save metadata');
      console.error('Error saving metadata:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm(`Are you sure you want to delete course "${courseId}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/course-editor/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete course');
      }

      await loadCourses();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete course');
      console.error('Error deleting course:', err);
    }
  };

  const normalizeBoolean = (value: boolean | string | undefined): string => {
    if (value === undefined || value === null) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'yes' || lower === 'true' || lower === '1') return 'Yes';
      if (lower === 'no' || lower === 'false' || lower === '0') return 'No';
    }
    return String(value);
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
            <h1 className="text-3xl font-bold text-foreground">Course List Editor</h1>
            <p className="text-muted-foreground mt-1">Manage course metadata from courses.yml</p>
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
              href="/course-editor/new"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </Link>
          </div>
        </div>

        {/* Ext Courses Info */}
        {extCoursesInfo && extCoursesInfo.enabled && (
          <div className="mb-4 p-4 bg-sky-50 border border-sky-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-sky-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-sky-900">Extended Courses Enabled</p>
                <p className="text-sm text-sky-700 mt-1">{extCoursesInfo.note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Course ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Path / Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Element
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Restricted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ban Enabled
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No courses found
                    </td>
                  </tr>
                ) : (
                  courses.map((course) => (
                    <tr key={course.course_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {course.course_id}
                          </span>
                          {course.is_from_db && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
                              <Database className="w-3 h-3 mr-1" />
                              DB
                            </span>
                          )}
                          {course.is_from_ext_courses && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Ext
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {course.path === 'db' ? (
                            <Database className="w-4 h-4 text-sky-600" />
                          ) : (
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm text-foreground font-mono">
                            {course.path}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {course.element || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {normalizeBoolean(course.restricted)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {normalizeBoolean(course.ban_enabled)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditMetadata(course.course_id)}
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted"
                            title="Edit metadata"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {course.path !== 'db' && (
                            <Link
                              href={`/course-editor/${course.course_id}`}
                              className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted"
                              title="Edit course content"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          {course.path === 'db' && (
                            <span
                              className="text-muted-foreground cursor-not-allowed p-1 rounded"
                              title="Cannot edit courses from database"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteCourse(course.course_id)}
                            className="text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors p-1 rounded hover:bg-muted"
                            title="Delete course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info about DB courses */}
        {courses.some(c => c.is_from_db) && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Courses from Database
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Courses marked with "DB" are stored in the database. Editing metadata in courses.yml may not affect these courses. 
                  Deleting them from courses.yml will not remove them from the database.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Metadata Modal */}
        {editingCourse && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => !saving && setEditingCourse(null)}
          >
            <div
              className="bg-card rounded-xl shadow-2xl w-[90%] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Edit Course Metadata</h2>
                  <p className="text-sm text-muted-foreground mt-1">Course ID: {editingCourse.course_id}</p>
                  {editingCourse.is_from_db && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-xs text-amber-800">
                        ⚠️ This course is stored in the database. Changes may not affect the course.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => !saving && setEditingCourse(null)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  disabled={saving}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="space-y-4">
                  {/* Path */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Path <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.path || ''}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      className="w-full px-4 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      placeholder="scripts/course.yml or db"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Path to course file or "db" for database courses
                    </p>
                  </div>

                  {/* Element */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Element (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.element || ''}
                      onChange={(e) => setFormData({ ...formData, element: e.target.value })}
                      className="w-full px-4 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                      placeholder="StartElement"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ID of the element to start from
                    </p>
                  </div>

                  {/* Restricted */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.restricted === true || formData.restricted === 'yes' || formData.restricted === 'true'}
                        onChange={(e) => setFormData({ ...formData, restricted: e.target.checked })}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                        disabled={saving}
                      />
                      <span className="text-sm font-medium text-foreground">Restricted Access</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      If enabled, access is checked against courseparticipants table
                    </p>
                  </div>

                  {/* Decline Text */}
                  {formData.restricted && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Decline Text (optional)
                      </label>
                      <textarea
                        value={formData.decline_text || ''}
                        onChange={(e) => setFormData({ ...formData, decline_text: e.target.value })}
                        className="w-full px-4 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                        rows={3}
                        placeholder="Message shown when access is denied"
                        disabled={saving}
                      />
                    </div>
                  )}

                  {/* Ban Enabled */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ban_enabled === true || formData.ban_enabled === 'yes' || formData.ban_enabled === 'true'}
                        onChange={(e) => setFormData({ ...formData, ban_enabled: e.target.checked })}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                        disabled={saving}
                      />
                      <span className="text-sm font-medium text-foreground">Ban Enabled</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      If enabled, users can be banned when limit is exceeded
                    </p>
                  </div>

                  {/* Ban Text */}
                  {formData.ban_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Ban Text (optional)
                      </label>
                      <textarea
                        value={formData.ban_text || ''}
                        onChange={(e) => setFormData({ ...formData, ban_text: e.target.value })}
                        className="w-full px-4 py-2 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors resize-none"
                        rows={3}
                        placeholder="Message shown when user is banned"
                        disabled={saving}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMetadata}
                  disabled={saving || !formData.path}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

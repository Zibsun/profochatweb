'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleTable } from './ScheduleTable';
import type { Schedule } from '@/lib/types/types';
import type { CourseSection, ScheduleSection } from '@/lib/types/schedule-types';

interface ScheduleTabProps {
  groupId: number;
  courseCode: string; // course_code вместо course_id
}

export function ScheduleTab({ groupId, courseCode }: ScheduleTabProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<ScheduleSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка секций курса и расписания
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем секции курса и расписание параллельно
      const [sectionsRes, scheduleRes] = await Promise.all([
        fetch(`/api/courses/${courseCode}/sections`),
        fetch(`/api/groups/${groupId}/schedule`),
      ]);

      if (!sectionsRes.ok) {
        throw new Error('Failed to load course sections');
      }

      const sectionsData = await sectionsRes.json();
      const courseSections: CourseSection[] = sectionsData.sections || [];

      // Получаем расписание
      let scheduleConfig: Schedule['schedule_config'] = {};
      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        if (scheduleData.schedule) {
          scheduleConfig = scheduleData.schedule.schedule_config || {};
        }
      }

      // Merge логика: объединяем секции курса и расписание
      const mergedSections: ScheduleSection[] = [];
      const scheduleSections = scheduleConfig.sections || {};

      // Случай 1 и 2: Секции из курса
      for (const courseSection of courseSections) {
        const scheduleSection = scheduleSections[courseSection.elementId];
        mergedSections.push({
          elementId: courseSection.elementId,
          title: courseSection.title,
          startTime: scheduleSection?.start_time ?? null,
          status: scheduleSection?.status ?? 'immediate',
          isDeleted: false,
        });
      }

      // Случай 3: Секции из расписания, которых нет в курсе
      for (const [elementId, scheduleSection] of Object.entries(scheduleSections)) {
        const existsInCourse = courseSections.some((s) => s.elementId === elementId);
        if (!existsInCourse) {
          mergedSections.push({
            elementId,
            title: scheduleSection.title || elementId,
            startTime: scheduleSection.start_time,
            status: scheduleSection.status,
            isDeleted: true,
          });
        }
      }

      setSections(mergedSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId, courseCode]);

  // Сохранение расписания
  const handleSave = async () => {
    try {
      setSaving(true);

      // Формируем schedule_config с секциями
      const sectionsConfig: Record<string, { start_time: string | null; status: 'scheduled' | 'immediate'; title?: string }> = {};

      for (const section of sections) {
        if (section.isDeleted) {
          // Сохраняем удаленные секции с title для возможности восстановления
          sectionsConfig[section.elementId] = {
            start_time: section.startTime,
            status: section.status,
            title: section.title,
          };
        } else {
          sectionsConfig[section.elementId] = {
            start_time: section.startTime,
            status: section.status,
          };
        }
      }

      const response = await fetch(`/api/groups/${groupId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schedule_type: 'custom',
          schedule_config: {
            sections: sectionsConfig,
          },
          is_active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      toast({
        title: 'Schedule saved',
        description: 'Schedule has been saved successfully',
      });

      // Перезагружаем данные для синхронизации
      await loadData();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save schedule',
        variant: 'destructive',
      });
      console.error('Error saving schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  // Обновление секции
  const handleSectionUpdate = (elementId: string, updates: Partial<ScheduleSection>) => {
    setSections((prev) =>
      prev.map((section) =>
        section.elementId === elementId ? { ...section, ...updates } : section
      )
    );
  };

  // Удаление секции (только для удаленных секций)
  const handleSectionDelete = (elementId: string) => {
    setSections((prev) => prev.filter((section) => section.elementId !== elementId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading schedule...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Error loading schedule</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Section Schedule</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Schedule
            </>
          )}
        </button>
      </div>

      <ScheduleTable
        sections={sections}
        onSectionUpdate={handleSectionUpdate}
        onSectionDelete={handleSectionDelete}
      />
    </div>
  );
}

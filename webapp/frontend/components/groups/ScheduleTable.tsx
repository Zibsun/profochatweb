'use client';

import { ScheduleRow } from './ScheduleRow';
import type { ScheduleSection } from '@/lib/types/schedule-types';

interface ScheduleTableProps {
  sections: ScheduleSection[];
  onSectionUpdate: (elementId: string, updates: Partial<ScheduleSection>) => void;
  onSectionDelete: (elementId: string) => void;
}

export function ScheduleTable({
  sections,
  onSectionUpdate,
  onSectionDelete,
}: ScheduleTableProps) {
  // Разделяем секции на обычные и удаленные
  const regularSections = sections.filter((s) => !s.isDeleted);
  const deletedSections = sections.filter((s) => s.isDeleted);

  if (sections.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">
          No sections found in the course. Add sections in the course editor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {regularSections.map((section) => (
              <ScheduleRow
                key={section.elementId}
                section={section}
                onUpdate={(updates) => onSectionUpdate(section.elementId, updates)}
                onDelete={section.isDeleted ? () => onSectionDelete(section.elementId) : undefined}
              />
            ))}
            {deletedSections.length > 0 && (
              <>
                {deletedSections.map((section) => (
                  <ScheduleRow
                    key={section.elementId}
                    section={section}
                    onUpdate={(updates) => onSectionUpdate(section.elementId, updates)}
                    onDelete={() => onSectionDelete(section.elementId)}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

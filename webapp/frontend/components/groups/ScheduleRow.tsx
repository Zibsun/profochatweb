'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { ScheduleSection } from '@/lib/types/schedule-types';

interface ScheduleRowProps {
  section: ScheduleSection;
  onUpdate: (updates: Partial<ScheduleRowProps['section']>) => void;
  onDelete?: () => void;
}

export function ScheduleRow({ section, onUpdate, onDelete }: ScheduleRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localDateTime, setLocalDateTime] = useState(() => {
    if (section.startTime) {
      // Конвертируем UTC в локальное время для input[type="datetime-local"]
      const date = new Date(section.startTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return '';
  });

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalDateTime(value);

    if (value) {
      // Конвертируем локальное время в UTC ISO 8601
      const localDate = new Date(value);
      const utcDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
      const isoString = utcDate.toISOString();

      onUpdate({
        startTime: isoString,
        status: 'scheduled',
      });
    } else {
      // Сброс в "Starts immediately"
      onUpdate({
        startTime: null,
        status: 'immediate',
      });
    }
  };

  const handleSetImmediate = () => {
    setLocalDateTime('');
    onUpdate({
      startTime: null,
      status: 'immediate',
    });
  };

  const formatDisplayTime = (startTime: string | null): string => {
    if (!startTime) {
      return 'Starts immediately';
    }

    try {
      const date = new Date(startTime);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const displayTitle = section.isDeleted
    ? `[Removed from course] ${section.title}`
    : section.title;

  return (
    <tr
      className={`hover:bg-muted/30 transition-colors ${
        section.isDeleted ? 'bg-muted/30 opacity-75' : ''
      }`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-foreground">
          {displayTitle}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={localDateTime}
              onChange={handleDateTimeChange}
              className="px-3 py-1.5 text-sm bg-background rounded-lg border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
            />
            <button
              onClick={handleSetImmediate}
              className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors text-foreground"
            >
              Immediate
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground">{formatDisplayTime(section.startTime)}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Edit
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {section.isDeleted && onDelete && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

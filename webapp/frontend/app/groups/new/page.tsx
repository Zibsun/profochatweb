"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Bot } from "@/lib/types/types";

type CourseOption = {
  course_id: string;
  course_code: string;
  title: string;
  description?: string;
};

export default function NewGroupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [botId, setBotId] = useState("");
  const [courseId, setCourseId] = useState("");

  const [bots, setBots] = useState<Bot[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [botsRes, coursesRes] = await Promise.all([
          fetch("/api/bots"),
          fetch("/api/courses"),
        ]);
        if (botsRes.ok) {
          const botsData = await botsRes.json();
          setBots(botsData.bots || []);
        }
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
        }
      } catch (e) {
        toast({
          title: "Error",
          description: "Failed to load bots or courses",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleSubmit = async () => {
    if (!name.trim() || !botId || !courseId) {
      toast({
        title: "Missing fields",
        description: "Please fill in name, bot, and course",
        variant: "destructive",
      });
      return;
    }

    const courseIdNum = Number(courseId);
    const botIdNum = Number(botId);
    if (!Number.isFinite(courseIdNum) || !Number.isFinite(botIdNum)) {
      toast({
        title: "Invalid selection",
        description: "Course and bot must be valid",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          course_id: courseIdNum,
          bot_id: botIdNum,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create group");
      }

      const data = await res.json();
      const createdId = data?.group?.group_id;
      toast({ title: "Group created", description: "Group is ready" });
      if (createdId) {
        router.push(`/groups?groupId=${createdId}`);
      } else {
        router.push("/groups");
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to create group",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 editor-root">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-lg p-6 text-foreground">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Create group</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a course and bot, then set name and optional description.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Group name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                placeholder="e.g. Winter cohort"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-background border border-input rounded-md focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors min-h-[96px]"
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Bot
                </label>
                <select
                  value={botId}
                  onChange={(e) => setBotId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                >
                  <option value="">Select bot</option>
                  {bots.map((bot) => (
                    <option key={bot.bot_id} value={String(bot.bot_id)}>
                      {bot.display_name || bot.bot_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background rounded-md border border-input focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.title || course.course_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {isActive ? "Active" : "Inactive"}
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Link
            href="/groups"
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={loading || saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Creating..." : "Create group"}
          </button>
        </div>
      </div>
    </div>
  );
}


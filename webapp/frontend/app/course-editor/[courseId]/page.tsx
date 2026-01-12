import { CourseEditor } from "@/components/course-editor/CourseEditor";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseEditor courseId={courseId} />;
}

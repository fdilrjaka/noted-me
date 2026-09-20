import { createFileRoute } from "@tanstack/react-router";
import { SubjectView } from "@/features/subject";

export const Route = createFileRoute("/subject/$subjectId")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: typeof search["page"] === "string" ? (search["page"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "NoteMe" },
      {
        name: "description",
        content:
          "Tulis catatan per pertemuan dengan editor teks kaya, foto, tabel, dan checklist di NoteMe.",
      },
      { property: "og:title", content: "NoteMe" },
      {
        property: "og:description",
        content: "Halaman pertemuan dengan editor teks kaya, gambar, dan auto-save.",
      },
    ],
  }),
  component: SubjectViewRoute,
});

function SubjectViewRoute() {
  const { subjectId } = Route.useParams();
  const { page } = Route.useSearch();
  return <SubjectView subjectId={subjectId} pageParam={page} />;
}

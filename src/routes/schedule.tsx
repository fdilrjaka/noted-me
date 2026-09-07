import { createFileRoute } from "@tanstack/react-router";
import { SchedulePage } from "@/features/schedule";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

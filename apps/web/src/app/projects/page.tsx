import type { Metadata } from "next";
import { ProjectsView } from "./ProjectsView";

export const metadata: Metadata = { title: "Projects — CineMind AI" };

export default function ProjectsPage() {
  return <ProjectsView />;
}

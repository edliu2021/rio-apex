import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  if (!isAuthed()) redirect("/activate");
  return <SettingsForm />;
}

import {
  legacyPhaseMapping,
  projectPhases,
  type ProjectPhaseType,
} from "@/lib/operations/projectConfig";

export function normalizePhaseType(
  raw: string | null | undefined
): ProjectPhaseType | null {
  if (!raw) return null;

  if (raw in projectPhases) return raw as ProjectPhaseType;

  const mapped = legacyPhaseMapping[raw];
  return mapped ?? null;
}

export function getPhaseConfig(raw: string | null | undefined) {
  const normalized = normalizePhaseType(raw);
  if (!normalized) return null;
  return projectPhases[normalized];
}

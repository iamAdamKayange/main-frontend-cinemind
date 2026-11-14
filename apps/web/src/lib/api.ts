"use client";

import type { EditOperation, TimelineDocument } from "@cinemind/timeline-engine";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://cinemind-api.46-62-239-174.sslip.io").replace(/\/$/, "");

const TOKEN_KEY = "cm-token";
const USER_KEY = "cm-user";

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function getUser(): User | null {
  try {
    const u = localStorage.getItem(USER_KEY);
    return u ? (JSON.parse(u) as User) : null;
  } catch {
    return null;
  }
}
export function setSession(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable */
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined && !(body instanceof FormData) ? { "content-type": "application/json" } : {}),
      },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the CineMind server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new ApiError(res.status, data?.code ?? "ERROR", data?.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface RemoteAsset {
  id: string;
  kind: "video" | "audio" | "image";
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationFrames: number | null;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  status: "uploaded" | "processing" | "analyzing" | "ready" | "failed";
  location: "device" | "cloud";
  fingerprint: string | null;
  url: string | null;
  proxyUrl: string | null;
  thumbUrl: string | null;
  analysis: { bpm: number | null; beats: number[]; peaks: number[]; peaksPerSecond: number; sceneCount: number } | null;
}

export interface TimelineState {
  timeline: TimelineDocument;
  canUndo: boolean;
  canRedo: boolean;
}

export interface ProjectPayload extends TimelineState {
  project: { id: string; title: string; aspect: string; updatedAt: string };
  assets: RemoteAsset[];
}

export interface Proposal {
  id: string;
  provider: string;
  model: string | null;
  reply: string;
  baseVersion: number;
  operations: EditOperation[];
  descriptions: string[];
  status: "proposed" | "none";
}

export interface RenderJob {
  id: string;
  status: "queued" | "preparing" | "rendering" | "uploading" | "completed" | "failed" | "cancelled";
  progress: number;
  preset: string;
  presetName?: string;
  errorCode?: string | null;
  version?: number | null;
}

export interface Provider {
  id: "anthropic" | "openai" | "google";
  label: string;
  model: string;
  configured: boolean;
}

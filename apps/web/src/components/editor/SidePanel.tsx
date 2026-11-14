"use client";

import { clipDuration, describeOperation, findClip, framesToTimecode, plan, type EditOperation } from "@cinemind/timeline-engine";
import { useEffect, useRef, useState } from "react";
import { Check, Send, Sparkle, X } from "@/components/ui/icons";
import { api, type Proposal, type Provider as ProviderInfo, type TimelineState } from "@/lib/api";
import { useEditor } from "./EditorContext";
import { EffectsGroup, FrameGroup, SoundGroup } from "./InspectorGroups";
import { FPS } from "./model";

type Provider = "anthropic" | "openai" | "google";
const DEFAULT_PROVIDERS: ProviderInfo[] = [
  { id: "anthropic", label: "Claude", model: "", configured: false },
  { id: "openai", label: "OpenAI", model: "", configured: false },
  { id: "google", label: "Gemini", model: "", configured: false },
];

type Msg =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "cine";
      text: string;
      ops?: EditOperation[];
      descriptions?: string[];
      proposalId?: string;
      via?: string;
      baseVersion?: number;
      status?: "proposed" | "applied" | "rejected" | "failed";
      appliedVersion?: number;
      retryPrompt?: string;
    };

const SUGGESTIONS = [
  "Cut the video to the beat of the song",
  "Remove the silences from the first clip",
  "Fade out the audio over 3 seconds",
  'Add a title "Bongo Nights"',
  "Kata video kwenye beat, kila beat 2",
];

const SOCIAL_STARTERS = [
  { title: "Beat Reel", detail: "9:16 · cuts to music", prompt: "Create a 9:16 Instagram Reel from my footage. Cut it to the beat, use 2 beats per shot, and keep the song as the soundtrack." },
  { title: "Talking Short", detail: "9:16 · remove pauses", prompt: "Create a 9:16 YouTube Short from my talking footage. Remove silences from the selected clip and keep the voice clear." },
  { title: "YouTube cut", detail: "16:9 · music montage", prompt: "Create a 16:9 YouTube music montage from my footage. Cut it to the beat, use 4 beats per shot, and keep the song as the soundtrack." },
];

let seq = 0;

export function SidePanel({ initialTab = "inspector" }: { initialTab?: "cine" | "inspector" | "history" }) {
  const [tab, setTab] = useState<"cine" | "inspector" | "history">(initialTab);
  const { projectId } = useEditor();

  return (
    <aside className="flex min-h-0 flex-col border-l border-line bg-surface">
      <div className="flex h-9 shrink-0 items-end gap-5 border-b border-line px-4 text-[12px]">
        {(projectId ? (["inspector", "cine", "history"] as const) : (["inspector", "cine"] as const)).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative pb-2 font-semibold ${tab === t ? "text-accent" : "text-muted hover:text-soft"}`}>
            {t === "cine" ? "Cine · AI copilot" : t === "inspector" ? "Inspector" : "History"}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "cine" ? <Copilot /> : tab === "inspector" ? <Inspector /> : <VersionHistory />}
    </aside>
  );
}

function Copilot() {
  const { doc, assets, selectedId, playhead, run, undo, projectId, applyServerState, notify } = useEditor();
  const [providers, setProviders] = useState<ProviderInfo[]>(DEFAULT_PROVIDERS);
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: ++seq,
      role: "cine",
      text: "Habari! I'm Cine. Tell me what the edit should do — in English or Kiswahili — and I'll propose exact timeline changes for you to review. Nothing is applied without your approval.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    api<{ providers: ProviderInfo[] }>("GET", "/ai/providers")
      .then((r) => {
        setProviderLoadError(null);
        setProviders(r.providers);
        const first = r.providers.find((p) => p.configured);
        if (first) setProvider(first.id);
      })
      .catch((e) => setProviderLoadError((e as Error).message));
  }, [projectId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  const labelOf = (id: string) => {
    const hit = findClip(doc, id);
    if (hit) return `“${hit.clip.label ?? hit.clip.text ?? id}”`;
    const a = assets.find((x) => x.id === id);
    return a ? `“${a.name}”` : "new clip";
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setMsgs((m) => [...m, { id: ++seq, role: "user", text: t }]);
    setInput("");
    setThinking(true);
    try {
      if (projectId) {
        const r = await api<Proposal>("POST", `/projects/${projectId}/ai/chat`, {
          message: t,
          provider,
          selectedClipId: selectedId,
          playheadSec: playhead / FPS,
        });
        const via = r.provider === "rules" ? "rule planner (no AI key on server)" : `${providers.find((p) => p.id === r.provider)?.label ?? r.provider}${r.model ? ` · ${r.model}` : ""}`;
        setMsgs((m) => [
          ...m,
          r.operations.length
            ? { id: ++seq, role: "cine", text: r.reply, ops: r.operations, descriptions: r.descriptions, proposalId: r.id, baseVersion: r.baseVersion, status: "proposed", via, retryPrompt: t }
            : { id: ++seq, role: "cine", text: r.reply, via },
        ]);
      } else {
        await new Promise((res) => setTimeout(res, 600));
        const r = plan(t, doc, assets, { selectedClipId: selectedId, playhead });
        setMsgs((m) => [
          ...m,
          r.operations.length
            ? { id: ++seq, role: "cine", text: r.reply, ops: r.operations, baseVersion: doc.version, status: "proposed", via: "demo planner", retryPrompt: t }
            : { id: ++seq, role: "cine", text: r.reply, via: "demo planner" },
        ]);
      }
    } catch (e) {
      const fallback = plan(t, doc, assets, { selectedClipId: selectedId, playhead });
      if (fallback.operations.length) {
        setMsgs((m) => [...m, {
          id: ++seq,
          role: "cine",
          text: `AI service haipatikani (${(e as Error).message}). Nimetumia planner ya msingi kuandaa mapendekezo haya; yahakiki kabla ya kuyatumia. Media yako haijatumwa.`,
          ops: fallback.operations,
          descriptions: fallback.operations.map((op) => describeOperation(op, FPS, labelOf)),
          baseVersion: doc.version,
          status: "proposed",
          via: "local fallback",
          retryPrompt: t,
        }]);
      } else {
        setMsgs((m) => [...m, { id: ++seq, role: "cine", text: `AI service haipatikani (${(e as Error).message}). Planner ya msingi haikuweza kupanga ombi hili. Unaweza kuendelea ku-edit kwa mikono au ujaribu tena. Media yako haijatumwa.`, via: "error", retryPrompt: t }]);
      }
    } finally {
      setThinking(false);
    }
  };

  const patch = (id: number, p: Partial<Extract<Msg, { role: "cine" }>>) => setMsgs((all) => all.map((x) => (x.id === id ? ({ ...x, ...p } as Msg) : x)));

  const decide = async (id: number, approve: boolean) => {
    const m = msgs.find((x) => x.id === id);
    if (!m || m.role !== "cine" || !m.ops) return;
    if (projectId && m.proposalId) {
      try {
        if (!approve) {
          await api("POST", `/projects/${projectId}/ai/operations/${m.proposalId}/reject`);
          return patch(id, { status: "rejected" });
        }
        const s = await api<TimelineState>("POST", `/projects/${projectId}/ai/operations/${m.proposalId}/approve`);
        applyServerState(s);
        notify("ok", `Applied ${m.ops.length} change${m.ops.length > 1 ? "s" : ""} from Cine`);
        return patch(id, { status: "applied", appliedVersion: s.timeline.version });
      } catch (e) {
        notify("error", (e as Error).message);
        return patch(id, { status: "failed" });
      }
    }
    if (!approve) return patch(id, { status: "rejected" });
    if (m.baseVersion !== doc.version) return patch(id, { status: "failed", text: m.text + " — The timeline changed since this plan; ask again so I can re-plan." });
    const r = run(m.ops, `Applied ${m.ops.length} change${m.ops.length > 1 ? "s" : ""} from Cine`);
    patch(id, r.ok ? { status: "applied", appliedVersion: doc.version + 1 } : { status: "failed" });
  };

  const current = providers.find((p) => p.id === provider);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-[12px]">
        <span className="text-muted">Model</span>
        <div className="flex rounded-full border border-line p-0.5">
          {providers.map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${provider === p.id ? "bg-white/10 text-text" : "text-muted hover:text-soft"}`}>
              {projectId && <span className={`h-1.5 w-1.5 rounded-full ${p.configured ? "bg-green-text" : "bg-white/20"}`} />}
              {p.label}
            </button>
          ))}
        </div>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted">Copilot</span>
      </div>
      {providerLoadError ? (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger/10 px-4 py-2 text-[11px] leading-relaxed text-[#ffb3a8]">
          <span className="min-w-0 flex-1">AI services hazipatikani kwa sasa. Unaweza kuendelea ku-edit kwa mikono. {providerLoadError}</span>
          <button onClick={() => void api<{ providers: ProviderInfo[] }>("GET", "/ai/providers").then((r) => { setProviderLoadError(null); setProviders(r.providers); }).catch((e) => setProviderLoadError((e as Error).message))} className="shrink-0 underline">Jaribu tena</button>
        </div>
      ) : (!projectId || !current?.configured) && (
        <div className="border-b border-line bg-sun/[0.07] px-4 py-2 text-[11px] leading-relaxed text-sun/90">
          {!projectId
            ? "Demo planner runs in your browser. Sign in for full AI editing with beat-sync and silence removal."
            : `${current?.label} has no API key on the server yet — using the built-in rule planner.`}
        </div>
      )}

      {projectId && <div className="border-b border-line bg-[radial-gradient(ellipse_at_top_left,rgba(41,189,240,0.09),transparent_70%)] px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-soft">Social cut starters</p>
          <span className="rounded-full border border-line px-2 py-0.5 text-[9px] text-muted">Plan · review · apply</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SOCIAL_STARTERS.map((starter, index) => (
            <button
              key={starter.title}
              onClick={() => void send(starter.prompt)}
              disabled={thinking}
              className={`rounded-[9px] border px-2 py-2 text-left transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/[0.07] disabled:opacity-40 ${index === 0 ? "border-accent/25 bg-accent/[0.04]" : "border-line bg-bg-deep/60"}`}
            >
              <span className="block truncate text-[10px] font-semibold text-text">{starter.title}</span>
              <span className="mt-0.5 block truncate text-[9px] text-faint">{starter.detail}</span>
            </button>
          ))}
        </div>
      </div>}

      <div ref={listRef} className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 rounded-[14px] rounded-br-[4px] bg-accent/15 px-3.5 py-2.5 text-[13px] text-text">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="fade-up">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-accent">
                <Sparkle size={13} /> Cine {m.via && <span className="font-normal text-faint">· {m.via}</span>}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-soft">{m.text}</p>
              {m.retryPrompt && (m.via === "error" || m.status === "failed" || m.via === "local fallback") && (
                <button onClick={() => void send(m.retryPrompt!)} disabled={thinking} className="mt-2 rounded-full border border-line-strong px-3 py-1 text-[11px] font-semibold text-soft hover:border-accent/50 hover:text-accent disabled:opacity-40">Jaribu tena</button>
              )}
              {m.ops && (
                <div className="mt-3 overflow-hidden rounded-[12px] border border-line bg-bg-deep">
                  <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[11px]">
                    <span className="text-muted">
                      {m.ops.length} operation{m.ops.length > 1 ? "s" : ""} · base v{m.baseVersion}
                    </span>
                    <StatusPill status={m.status!} />
                  </div>
                  <ol className="thin-scroll max-h-56 space-y-1.5 overflow-y-auto px-3 py-2.5">
                    {m.ops.map((op, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-soft">
                        <span className="font-mono text-faint">{i + 1}</span>
                        <span>{m.descriptions?.[i] ?? describeOperation(op, FPS, labelOf)}</span>
                      </li>
                    ))}
                  </ol>
                  {m.status === "proposed" && (
                    <div className="flex gap-2 border-t border-line p-2.5">
                      <button onClick={() => decide(m.id, true)} className="btn-primary flex-1 justify-center !py-1.5 text-[12px]">
                        <Check size={13} /> Approve & apply
                      </button>
                      <button onClick={() => decide(m.id, false)} className="flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-[12px] text-soft hover:bg-white/5">
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                  {m.status === "applied" && (
                    <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-muted">
                      <span>Saved as timeline v{m.appliedVersion}</span>
                      <button onClick={undo} className="font-semibold text-accent hover:underline">
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="thinking flex items-center gap-1.5 text-[12px] text-accent">
            <Sparkle size={13} /> Reading the timeline
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <div className="thin-scroll mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:border-accent/50 hover:text-accent">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 rounded-[14px] border border-line-strong bg-bg-deep p-2 focus-within:border-accent/60"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="Describe the edit… / Eleza uhariri…"
            className="min-h-0 flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim() || thinking} className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-30">
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: NonNullable<Extract<Msg, { role: "cine" }>["status"]> }) {
  const map = {
    proposed: "bg-accent/15 text-accent",
    applied: "bg-ok/15 text-ok",
    rejected: "bg-white/10 text-muted",
    failed: "bg-danger/15 text-danger",
  } as const;
  return <span className={`rounded px-1.5 py-0.5 capitalize ${map[status]}`}>{status}</span>;
}

function Inspector() {
  const { doc, selectedId, run, assetById, playhead, select } = useEditor();
  const hit = selectedId ? findClip(doc, selectedId) : null;

  if (!hit) {
    return <div className="grid flex-1 place-items-center p-8 text-center text-[13px] text-faint">Select a clip on the timeline to see its properties.</div>;
  }
  const { clip, track } = hit;
  const asset = clip.assetId ? assetById.get(clip.assetId) : null;
  const sec = (f: number) => (f / FPS).toFixed(2);

  return (
    <div className="thin-scroll min-h-0 flex-1 space-y-6 overflow-y-auto p-4 text-[13px]">
      <div>
        <p className="text-[11px] text-muted">{track.kind === "text" ? "Title" : asset?.kind ?? "Clip"} · {track.name}</p>
        <p className="mt-1 text-[16px] text-text">{clip.label ?? clip.text}</p>
        {track.locked && <p className="mt-1 text-[11px] text-danger">Track is locked</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ActionBtn
            label="Duplicate"
            onClick={() => {
              const end = Math.max(...track.clips.map((c) => c.timelineStartFrames + clipDuration(c)));
              if (track.kind === "text") run([{ type: "title.add", trackId: track.id, text: clip.text ?? "Title", startFrame: end, durationFrames: clipDuration(clip) }], "Duplicated title");
              else if (clip.assetId) run([{ type: "clip.insert", assetId: clip.assetId, trackId: track.id, timelineStartFrames: end, sourceInFrames: clip.sourceInFrames, sourceOutFrames: clip.sourceOutFrames }], "Duplicated clip");
            }}
          />
          <ActionBtn
            label="Split at playhead"
            disabled={!(playhead > clip.timelineStartFrames && playhead < clip.timelineStartFrames + clipDuration(clip))}
            onClick={() => run([{ type: "clip.split", clipId: clip.id, atTimelineFrame: playhead }], "Split clip")}
          />
          <ActionBtn
            label="Delete"
            danger
            onClick={() => {
              if (run([{ type: "clip.delete", clipId: clip.id }], "Deleted clip").ok) select(null);
            }}
          />
        </div>
      </div>

      {track.kind === "text" && (
        <Group title="Text">
          <TextField value={clip.text ?? ""} onCommit={(v) => run([{ type: "title.update", clipId: clip.id, text: v }])} />
        </Group>
      )}

      {track.kind === "video" && <TransitionsGroup clipId={clip.id} />}

      <Group title="Timing">
        <Row label="Start">{framesToTimecode(clip.timelineStartFrames, FPS)}</Row>
        <Row label="Duration">{sec(clipDuration(clip))}s</Row>
        {track.kind !== "text" && (
          <>
            <NumField
              label="Source in (s)"
              value={Number(sec(clip.sourceInFrames))}
              step={0.1}
              onCommit={(v) => run([{ type: "clip.trim", clipId: clip.id, sourceInFrames: Math.round(v * FPS), sourceOutFrames: clip.sourceOutFrames }])}
            />
            <NumField
              label="Source out (s)"
              value={Number(sec(clip.sourceOutFrames))}
              step={0.1}
              onCommit={(v) => run([{ type: "clip.trim", clipId: clip.id, sourceInFrames: clip.sourceInFrames, sourceOutFrames: Math.round(v * FPS) }])}
            />
          </>
        )}
        {track.kind === "text" && (
          <NumField
            label="Duration (s)"
            value={Number(sec(clipDuration(clip)))}
            step={0.5}
            onCommit={(v) => run([{ type: "clip.trim", clipId: clip.id, sourceInFrames: 0, sourceOutFrames: Math.round(v * FPS) }])}
          />
        )}
      </Group>

      {track.kind !== "audio" && <FrameGroup clipId={clip.id} />}
      {track.kind !== "audio" && <EffectsGroup clipId={clip.id} />}
      {(track.kind === "audio" || asset?.kind === "video") && <SoundGroup clipId={clip.id} />}

      {track.kind === "audio" && (
        <Group title="Levels">
          <Slider label="Gain" min={-30} max={12} step={0.5} value={clip.gainDb ?? 0} fmt={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`} onCommit={(v) => run([{ type: "audio.setGain", clipId: clip.id, gainDb: v }])} />
          <NumField label="Fade in (s)" value={Number(sec(clip.fadeInFrames ?? 0))} step={0.1} onCommit={(v) => run([{ type: "audio.setFades", clipId: clip.id, fadeInFrames: Math.round(v * FPS), fadeOutFrames: clip.fadeOutFrames ?? 0 }])} />
          <NumField label="Fade out (s)" value={Number(sec(clip.fadeOutFrames ?? 0))} step={0.1} onCommit={(v) => run([{ type: "audio.setFades", clipId: clip.id, fadeInFrames: clip.fadeInFrames ?? 0, fadeOutFrames: Math.round(v * FPS) }])} />
        </Group>
      )}

      {asset && (
        <Group title="Source media">
          <Row label="File">{asset.name}</Row>
          <Row label="Length">{sec(asset.durationFrames)}s</Row>
          <Row label="Storage">{asset.url ? "This device" : "Sample media"}</Row>
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 border-b border-line pb-1.5 text-[11px] uppercase tracking-[0.08em] text-muted">{title}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="truncate font-mono text-[12px] text-soft">{children}</span>
    </div>
  );
}

function NumField({ label, value, step, onCommit }: { label: string; value: number; step: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(String(value));
  }
  const commit = () => {
    const n = Number(v);
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setV(String(value));
  };
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <input
        type="number"
        step={step}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-24 rounded-[3px] border border-line bg-bg-deep px-2 py-1 text-right font-mono text-[12px] outline-none focus:border-accent/50"
      />
    </label>
  );
}

function Slider({ label, min, max, step, value, fmt, onCommit }: { label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string; onCommit: (v: number) => void }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(value);
  }
  return (
    <label className="block">
      <span className="flex justify-between">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-[12px] text-soft">{fmt(v)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={() => v !== value && onCommit(v)}
        onKeyUp={() => v !== value && onCommit(v)}
        className="mt-1 w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function ActionBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-30 ${danger ? "border-danger/40 text-[#ffb3a8] hover:bg-danger/10" : "border-line-strong text-soft hover:border-accent/50 hover:text-text"}`}
    >
      {label}
    </button>
  );
}

function TextField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setV(value);
  }
  return (
    <textarea
      value={v}
      rows={2}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onCommit(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="w-full resize-none rounded-[8px] border border-line bg-bg-deep px-3 py-2 text-[14px] outline-none focus:border-accent/50"
    />
  );
}

const TRANSITIONS = [
  { kind: "dissolve" as const, label: "Dissolve" },
  { kind: "fade" as const, label: "Fade" },
  { kind: "dip-to-black" as const, label: "Dip to black" },
];

function TransitionsGroup({ clipId }: { clipId: string }) {
  const { doc, run } = useEditor();
  const hit = findClip(doc, clipId);
  if (!hit) return null;
  const next = hit.track.clips[hit.index + 1];
  const adjacent = next && next.timelineStartFrames === hit.clip.timelineStartFrames + clipDuration(hit.clip);
  const existing = doc.transitions.filter((t) => t.fromClipId === clipId || t.toClipId === clipId);
  const maxDur = adjacent ? Math.min(clipDuration(hit.clip), clipDuration(next)) : 0;
  return (
    <Group title="Transitions">
      {existing.map((t) => (
        <div key={t.id} className="flex items-center justify-between">
          <span className="text-soft">
            {t.kind} · {(t.durationFrames / FPS).toFixed(1)}s {t.toClipId === clipId ? "(in)" : "(out)"}
          </span>
          <button onClick={() => run([{ type: "transition.remove", transitionId: t.id }], "Removed transition")} className="text-[11px] text-muted hover:text-danger">
            Remove
          </button>
        </div>
      ))}
      {adjacent && !existing.some((t) => t.fromClipId === clipId) ? (
        <div className="flex flex-wrap gap-1.5">
          {TRANSITIONS.map((t) => (
            <ActionBtn key={t.kind} label={`+ ${t.label}`} onClick={() => run([{ type: "transition.add", fromClipId: clipId, toClipId: next.id, kind: t.kind, durationFrames: Math.min(15, maxDur) }], `Added ${t.label.toLowerCase()}`)} />
          ))}
        </div>
      ) : (
        !existing.length && <p className="text-[12px] text-faint">Place another clip right after this one to add a transition.</p>
      )}
    </Group>
  );
}

interface VersionRow {
  version: number;
  source: string;
  createdAt: string;
}

/** Every change is a version; restoring creates a new version, so nothing is ever lost. */
function VersionHistory() {
  const { projectId, doc, applyServerState, notify } = useEditor();
  const [items, setItems] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let live = true;
    api<{ items: VersionRow[] }>("GET", `/projects/${projectId}/timeline/versions`)
      .then((r) => live && setItems(r.items))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [projectId, doc.version]);

  const restore = async (v: number) => {
    if (!projectId) return;
    setBusy(v);
    try {
      const s = await api<TimelineState>("POST", `/projects/${projectId}/timeline/restore/${v}`);
      applyServerState(s);
      notify("ok", `Restored version ${v} as v${s.timeline.version}`);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const label = (src: string) =>
    src === "create" ? "Project created" : src === "manual" ? "Manual edit" : src.startsWith("ai:") ? "Cine edit" : src.startsWith("restore:") ? `Restored v${src.split(":")[1]}` : src;

  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4">
      <p className="mb-3 text-[12px] text-muted">Every change is saved as a version. Restoring adds a new version — nothing is lost.</p>
      {!items && <p className="text-[12px] text-faint">Loading…</p>}
      <ol className="space-y-1.5">
        {items?.map((v) => (
          <li key={v.version} className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-[12px] ${v.version === doc.version ? "border-accent/50 bg-accent/[0.07]" : "border-line"}`}>
            <span>
              <span className="font-mono text-faint">v{v.version}</span> <span className="ml-1 text-soft">{label(v.source)}</span>
              <span className="block text-[11px] text-faint">{new Date(v.createdAt).toLocaleString()}</span>
            </span>
            {v.version === doc.version ? (
              <span className="text-[11px] font-semibold text-accent">Current</span>
            ) : (
              <button disabled={busy !== null} onClick={() => restore(v.version)} className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] text-soft hover:border-accent/50 hover:text-text disabled:opacity-40">
                {busy === v.version ? "…" : "Restore"}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

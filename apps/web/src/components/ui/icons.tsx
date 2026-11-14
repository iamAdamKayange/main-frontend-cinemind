type P = { className?: string; size?: number };

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ArrowRight = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowDown = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);
export const ChevronDown = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M6 9l6 6 6-6" /></svg>
);
export const Play = ({ className, size }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none"><path d="M7 4.5v15l13-7.5z" /></svg>
);
export const Pause = ({ className, size }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
);
export const Undo = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 010 11H11" /></svg>
);
export const Redo = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 000 11H13" /></svg>
);
export const Scissors = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" /></svg>
);
export const Trash = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
);
export const Upload = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>
);
export const Sparkle = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
);
export const Film = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>
);
export const Music = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
);
export const TextIcon = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7V5h16v2M9 19h6M12 5v14" /></svg>
);
export const Folder = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
);
export const Monitor = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
);
export const Phone = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>
);
export const Globe = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>
);
export const Cloud = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M7 18a5 5 0 01-.9-9.9A6 6 0 0117.7 9 4.5 4.5 0 0117.5 18z" /></svg>
);
export const Check = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12l5 5 9-10" /></svg>
);
export const X = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Plus = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const Eye = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const EyeOff = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M3 3l18 18" /><path d="M10.6 5.1A10.6 10.6 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 005.4-1.6" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
);
export const Lock = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);
export const Volume = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
);
export const Mute = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
);
export const Send = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const Export = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></svg>
);
export const SkipBack = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M19 20L9 12l10-8zM5 19V5" /></svg>
);
export const SkipFwd = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><path d="M5 4l10 8-10 8zM19 5v14" /></svg>
);
export const ZoomIn = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M11 8v6M8 11h6" /></svg>
);
export const ZoomOut = ({ className, size }: P) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8 11h6" /></svg>
);

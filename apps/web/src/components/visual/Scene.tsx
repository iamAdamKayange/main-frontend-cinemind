"use client";

import { useId } from "react";

export type SceneVariant = "coast" | "stage" | "city" | "desert" | "studio" | "forest" | "dawn";

/**
 * Illustrative cinematic frames drawn in SVG — placeholder "footage" for the
 * marketing site and editor thumbnails until real media is uploaded.
 */
export function Scene({
  variant,
  className = "",
  focus = 0.5,
}: {
  variant: SceneVariant;
  className?: string;
  /** Horizontal shift of the subject (0..1), used to make sibling shots feel different. */
  focus?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const g = (n: string) => `${uid}-${n}`;
  const shift = (focus - 0.5) * 300;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      aria-hidden
    >
      <defs>
        <filter id={g("blur")}>
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id={g("soft")}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id={g("vig")} cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {variant === "coast" && (
        <>
          <defs>
            <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1d2a38" />
              <stop offset="0.45" stopColor="#6b5a5e" />
              <stop offset="0.62" stopColor="#d08a52" />
              <stop offset="0.7" stopColor="#f1b46a" />
            </linearGradient>
            <linearGradient id={g("sea")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b4a52" />
              <stop offset="1" stopColor="#0e1418" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
          <circle cx={1150 + shift} cy="560" r="70" fill="#ffd79a" opacity="0.9" filter={`url(#${g("blur")})`} />
          <ellipse cx="800" cy="300" rx="900" ry="80" fill="#a9a2a6" opacity="0.18" filter={`url(#${g("blur")})`} />
          <rect y="590" width="1600" height="310" fill={`url(#${g("sea")})`} />
          <rect x={1000 + shift} y="595" width="320" height="6" fill="#ffcf8a" opacity="0.5" filter={`url(#${g("soft")})`} />
          <path
            d={`M0 900 L0 420 C ${120 + shift / 3} 380 ${220 + shift / 3} 300 ${360 + shift / 3} 320 C ${470 + shift / 3} 340 ${560 + shift / 3} 470 ${700 + shift / 3} 560 L ${820 + shift / 3} 640 L 900 900 Z`}
            fill="#0d1110"
          />
          <path d="M0 900 L0 720 C 300 690 600 760 900 900 Z" fill="#1b2216" opacity="0.9" />
          <rect x={300 + shift / 2} y="560" width="16" height="70" rx="6" fill="#0a0c0b" />
          <circle cx={308 + shift / 2} cy="548" r="11" fill="#0a0c0b" />
        </>
      )}

      {variant === "stage" && (
        <>
          <defs>
            <linearGradient id={g("bg")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#120c1f" />
              <stop offset="1" stopColor="#05040a" />
            </linearGradient>
            <linearGradient id={g("beamA")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b48cff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#b48cff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={g("beamB")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4fd1c5" stopOpacity="0.75" />
              <stop offset="1" stopColor="#4fd1c5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("bg")})`} />
          <polygon points={`${500 + shift},0 ${560 + shift},0 ${980 + shift},900 ${380 + shift},900`} fill={`url(#${g("beamA")})`} opacity="0.55" filter={`url(#${g("soft")})`} />
          <polygon points={`${1080 + shift},0 ${1130 + shift},0 ${1300 + shift},900 ${700 + shift},900`} fill={`url(#${g("beamB")})`} opacity="0.45" filter={`url(#${g("soft")})`} />
          <ellipse cx={800 + shift} cy="640" rx="180" ry="40" fill="#e8d7ff" opacity="0.18" filter={`url(#${g("blur")})`} />
          <path d={`M${770 + shift} 640 q30 -150 60 0 Z`} fill="#0b0812" />
          <circle cx={800 + shift} cy="470" r="26" fill="#0b0812" />
          <path d={`M${770 + shift} 500 h60 l20 150 h-100 Z`} fill="#0b0812" />
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx={i * 64 + 10} cy={860 - (i % 3) * 14} r={46 + (i % 4) * 6} fill="#030206" />
          ))}
        </>
      )}

      {variant === "city" && (
        <>
          <defs>
            <linearGradient id={g("bg")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1022" />
              <stop offset="1" stopColor="#1a0b1c" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("bg")})`} />
          {[
            [200, 300, 90, "#ff4f9a"],
            [520, 220, 60, "#4fc3ff"],
            [900, 360, 110, "#ffb347"],
            [1240, 260, 80, "#ff4f9a"],
            [1420, 420, 70, "#7f6bff"],
            [700, 520, 50, "#4fc3ff"],
            [340, 560, 70, "#ffb347"],
          ].map(([x, y, r, c], i) => (
            <circle key={i} cx={(x as number) + shift / 2} cy={y as number} r={r as number} fill={c as string} opacity="0.45" filter={`url(#${g("blur")})`} />
          ))}
          {Array.from({ length: 14 }).map((_, i) => {
            const w = 70 + ((i * 37) % 60);
            const h = 220 + ((i * 53) % 300);
            return <rect key={i} x={i * 118 - 20} y={900 - h} width={w} height={h} fill="#06070d" />;
          })}
          {Array.from({ length: 60 }).map((_, i) => (
            <rect key={`w${i}`} x={(i * 97) % 1600} y={560 + ((i * 41) % 300)} width="6" height="9" fill="#ffd27a" opacity={0.25 + (i % 5) * 0.12} />
          ))}
        </>
      )}

      {variant === "desert" && (
        <>
          <defs>
            <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3c27a" />
              <stop offset="0.6" stopColor="#e48d4c" />
              <stop offset="1" stopColor="#b5552f" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
          <circle cx={520 + shift} cy="380" r="110" fill="#fff1c9" opacity="0.85" filter={`url(#${g("soft")})`} />
          <path d="M0 620 C 300 520 600 640 900 580 C 1200 520 1400 600 1600 560 L1600 900 L0 900Z" fill="#9b4a2a" />
          <path d="M0 720 C 400 640 700 780 1100 700 C 1300 660 1450 700 1600 690 L1600 900 L0 900Z" fill="#6e2f1d" />
          <path d="M0 820 C 500 760 900 880 1600 800 L1600 900 L0 900Z" fill="#3e1a10" />
          <rect x={980 + shift / 2} y="640" width="10" height="44" fill="#2a120a" />
          <circle cx={985 + shift / 2} cy="632" r="8" fill="#2a120a" />
        </>
      )}

      {variant === "studio" && (
        <>
          <defs>
            <radialGradient id={g("lamp")} cx={`${50 + shift / 32}%`} cy="35%" r="60%">
              <stop offset="0" stopColor="#f2b56b" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#6a3b1d" stopOpacity="0.6" />
              <stop offset="1" stopColor="#120c08" />
            </radialGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("lamp")})`} />
          <rect x={760 + shift} y="250" width="80" height="150" rx="40" fill="#1b130d" />
          <rect x={790 + shift} y="400" width="20" height="300" fill="#1b130d" />
          <path d={`M${720 + shift} 360 a80 80 0 0 0 160 0`} stroke="#1b130d" strokeWidth="12" fill="none" />
          <rect x="0" y="740" width="1600" height="160" fill="#0e0906" />
          {Array.from({ length: 7 }).map((_, i) => (
            <rect key={i} x={120 + i * 200} y="120" width="120" height="420" fill="#0a0705" opacity="0.35" />
          ))}
        </>
      )}

      {variant === "forest" && (
        <>
          <defs>
            <linearGradient id={g("bg")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9d6c3" />
              <stop offset="0.5" stopColor="#5f7a62" />
              <stop offset="1" stopColor="#14201a" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("bg")})`} />
          {Array.from({ length: 18 }).map((_, i) => {
            const x = ((i * 173) % 1700) - 50 + shift / 3;
            const depth = (i % 3) / 2;
            return (
              <rect key={i} x={x} y="0" width={30 + depth * 50} height="900" fill="#0f1a13" opacity={0.35 + depth * 0.55} />
            );
          })}
          <ellipse cx="800" cy="620" rx="900" ry="120" fill="#dfe8db" opacity="0.25" filter={`url(#${g("blur")})`} />
        </>
      )}

      {variant === "dawn" && (
        <>
          <defs>
            <linearGradient id={g("sky")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#24304a" />
              <stop offset="0.55" stopColor="#8a6f86" />
              <stop offset="0.8" stopColor="#e8a98a" />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
          <path d="M0 640 L220 470 L380 560 L620 380 L860 560 L1040 450 L1260 600 L1420 500 L1600 580 L1600 900 L0 900Z" fill="#2c2a3a" />
          <path d="M0 740 L300 600 L520 700 L800 580 L1100 720 L1360 640 L1600 720 L1600 900 L0 900Z" fill="#191826" />
          <ellipse cx={800 + shift} cy="560" rx="700" ry="50" fill="#f4d0bc" opacity="0.3" filter={`url(#${g("blur")})`} />
        </>
      )}

      <rect width="1600" height="900" fill={`url(#${g("vig")})`} />
    </svg>
  );
}

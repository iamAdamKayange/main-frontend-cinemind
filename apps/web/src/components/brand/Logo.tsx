import Link from "next/link";

/**
 * CineMind mark: a lens/play shape cut by the diagonal band of the Tanzanian flag
 * (kijani · jua · nyeusi · jua · bahari).
 */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <clipPath id="cm-lens">
          <circle cx="16" cy="16" r="15" />
        </clipPath>
      </defs>
      <g clipPath="url(#cm-lens)">
        <path d="M0 0H32V32H0Z" fill="#00a3dd" />
        <path d="M0 0H26L0 26Z" fill="#1eb53a" />
        <path d="M26 0H32V2L2 32H0V26Z" fill="#fcd116" />
        <path d="M28.5 0H32V3.5L3.5 32H0V28.5Z" fill="#050505" />
      </g>
      <circle cx="16" cy="16" r="15" fill="none" stroke="rgba(255,255,255,0.18)" />
      <path d="M12.5 10 L22.5 16 L12.5 22 Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-display text-[21px] font-semibold tracking-[-0.03em] text-text">
      <LogoMark />
      <span>
        Cine<span className="text-accent">Mind</span>
      </span>
    </Link>
  );
}

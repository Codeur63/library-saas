import type { LibraryDocument } from "@/types/library";
import { cn } from "@/lib/utils";

const GRADIENTS: [string, string][] = [
  ["#1e3a8a", "#3b82f6"],
  ["#0f766e", "#2dd4bf"],
  ["#b45309", "#fbbf24"],
  ["#5b21b6", "#8b5cf6"],
  ["#9d174d", "#ec4899"],
  ["#0e7490", "#22d3ee"],
  ["#166534", "#4ade80"],
  ["#7c2d12", "#fb923c"],
];

const STOP_WORDS = new Set(["de", "des", "du", "et", "la", "le", "les"]);

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function gradientFor(code: string): [string, string] {
  return GRADIENTS[hashString(code) % GRADIENTS.length];
}

function initialsOf(value: string): string {
  const words = value
    .split(/[\s’'-]+/)
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()));
  const letters = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  const truncated = words.join(" ") !== lines.join(" ");
  if (truncated && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
  }
  return lines;
}

export default function DocumentCover({
  document,
  uid,
  className,
}: {
  document: LibraryDocument;
  uid: string;
  className?: string;
}) {
  const gradient = gradientFor(document.category.code);
  const gradientId = `cover-grad-${uid}`;
  const stripesId = `cover-stripes-${uid}`;
  const badge = document.category.name;
  const badgeWidth = 18 + badge.length * 7;
  const titleLines = wrapTitle(document.title, 17, 4);
  const programName = document.subject.program.name;

  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className={cn("block", className)}
      role="img"
      aria-label={`Couverture du document : ${document.title}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
        <pattern
          id={stripesId}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="7" height="7" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />
        </pattern>
      </defs>

      <rect width="300" height="400" fill={`url(#${gradientId})`} />
      <rect width="300" height="400" fill={`url(#${stripesId})`} />
      <rect width="14" height="400" fill="rgba(0,0,0,0.2)" />
      <rect x="14" width="2" height="400" fill="rgba(255,255,255,0.12)" />

      <g transform="translate(26,26)">
        <rect
          width={badgeWidth}
          height="26"
          rx="13"
          fill="rgba(255,255,255,0.16)"
          stroke="rgba(255,255,255,0.35)"
        />
        <text x={badgeWidth / 2} y="17" textAnchor="middle" fontSize="12" fontWeight="600" fill="#ffffff">
          {badge}
        </text>
      </g>

      <text
        x="274"
        y="44"
        textAnchor="end"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.18em"
        fill="rgba(255,255,255,0.85)"
      >
        UPAC
      </text>

      <g transform="translate(150,155)">
        <circle r="46" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        <text y="12" textAnchor="middle" fontSize="36" fontWeight="700" fill="#ffffff">
          {initialsOf(programName)}
        </text>
      </g>

      <text x="26" y="336" fontSize="11" fontWeight="600" letterSpacing="0.12em" fill="rgba(255,255,255,0.92)">
        {programName.toUpperCase()}
      </text>

      {titleLines.map((line, index) => (
        <text key={index} x="26" y={354 + index * 19} fontSize="16" fontWeight="600" fill="#ffffff">
          {line}
        </text>
      ))}

      <text x="274" y="390" textAnchor="end" fontSize="11" fontWeight="500" fill="rgba(255,255,255,0.85)">
        {document.subject.level.code}
      </text>
    </svg>
  );
}

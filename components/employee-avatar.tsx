import { cn } from "@/lib/utils";

interface EmployeeAvatarProps {
  id: string;
  name: string;
  color: string;
  /** Object key of the photo, or null/undefined when none exists. */
  avatarKey?: string | null;
  /** Diameter in pixels. Clamped to a MIN_AVATAR_SIZE floor so faces stay legible. */
  size?: number;
  className?: string;
}

/** Avatars never render smaller than this so the photo is always recognisable. */
const MIN_AVATAR_SIZE = 50;

/**
 * Round avatar for a colaborador. Renders the profile photo (streamed through
 * the auth-protected /api/avatar/[id] proxy) when available, otherwise a
 * coloured circle with the person's initial. The `?v=` query is the object key
 * so the browser cache busts automatically whenever the photo changes.
 */
export function EmployeeAvatar({
  id,
  name,
  color,
  avatarKey,
  size = 24,
  className,
}: EmployeeAvatarProps) {
  const px = Math.max(size, MIN_AVATAR_SIZE);
  const dimensions = { width: px, height: px };
  const base = cn("shrink-0 rounded-full border", className);

  if (avatarKey) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${id}?v=${encodeURIComponent(avatarKey)}`}
        alt={name}
        width={px}
        height={px}
        style={dimensions}
        className={cn(base, "object-cover")}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{ ...dimensions, backgroundColor: color }}
      className={cn(
        base,
        "inline-flex items-center justify-center font-semibold leading-none text-white"
      )}
      aria-label={name}
    >
      <span style={{ fontSize: Math.round(px * 0.45) }}>{initial}</span>
    </span>
  );
}

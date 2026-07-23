/* Hallmark · component: brand mark · design-system: design.md
 *
 * The app's real mark, taken from src/app/icon.svg (the favicon) so the tab
 * icon and the in-app logo are the same object. Inlined rather than loaded as
 * an <img>: no request, no dependence on Next's metadata-route hashing, and it
 * can take its colours from the theme.
 *
 * Colours come through Tailwind classes (`fill-brand` / `stroke-panel`) rather
 * than SVG attributes or inline styles, so the mark follows light and dark mode
 * and stays inside the token system.
 */

import { cn } from "@/lib/utils";

export function BapLogo({
    className,
    ...props
}: Omit<React.ComponentProps<"svg">, "children">) {
    return (
        <svg
            viewBox="0 0 24 24"
            role="img"
            aria-label="BAP System"
            className={cn("shrink-0", className)}
            {...props}
        >
            <rect width="24" height="24" rx="6" className="fill-brand" />
            <g
                fill="none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-panel"
            >
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2a3 3 0 0 0-3 3c0 2 3 3 3 3s3-1 3-3a3 3 0 0 0-3-3Z" />
                <path d="M12 22a3 3 0 0 0 3-3c0-2-3-3-3-3s-3 1-3 3a3 3 0 0 0 3 3Z" />
                <path d="M20 8.5a3 3 0 0 0-4.1-.5c-1.6 1.1-1.3 4.1-1.3 4.1s2.8 1.1 4.1-.5a3 3 0 0 0 1.3-3.1Z" />
                <path d="M4 15.5a3 3 0 0 0 4.1.5c1.6-1.1 1.3-4.1 1.3-4.1s-2.8-1.1-4.1.5a3 3 0 0 0-1.3 3.1Z" />
                <path d="M20 15.5a3 3 0 0 0-1.3-3.1c-1.3-1.6-4.1-.5-4.1-.5s-.3 3 1.3 4.1a3 3 0 0 0 4.1-.5Z" />
                <path d="M4 8.5a3 3 0 0 0 1.3 3.1c1.3 1.6 4.1.5 4.1.5s.3-3-1.3-4.1a3 3 0 0 0-4.1.5Z" />
            </g>
        </svg>
    );
}

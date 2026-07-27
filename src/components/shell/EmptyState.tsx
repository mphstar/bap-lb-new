/* Hallmark · component: empty-state · genre: modern-minimal · theme: design.md
 * component-scope — no macrostructure, no nav/footer, no enrichment.
 * contrast: pass (40–41) · tokens: pass (48) · chrome: pass (47)
 *
 * The old version was a 48px tile plus two lines of text floating in a tall
 * bordered box: the dead space read louder than the message. Three changes,
 * each with a reason:
 *
 * · A masked dot field behind the cluster. It is the visual language of "a
 *   canvas nobody has filled yet", so it is motivated rather than decorative
 *   (a blob or a hand-drawn browser window would not be — see gate 45/47).
 * · The cluster is width-capped and vertically tighter, so it reads as one
 *   object instead of three stranded elements.
 * · An optional `hint` rail under a hairline, for the caller to name the ways
 *   in. Nothing is invented here — if the caller passes no hint, none renders.
 */

import { cn } from "@/lib/utils";
import { IconTile } from "./Panel";

interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Buttons. Keep labels short so they never wrap to two lines. */
    actions?: React.ReactNode;
    /** Secondary routes in, shown under a hairline. Caller-supplied only. */
    hint?: React.ReactNode;
    /** `panel` draws the hairline container; `bare` sits inside one already. */
    variant?: "panel" | "bare";
    /** `compact` for empty states nested inside a panel body or a table. */
    size?: "default" | "compact";
}

export function EmptyState({
    icon,
    title,
    description,
    actions,
    hint,
    variant = "panel",
    size = "default",
    className,
    ...props
}: EmptyStateProps) {
    const compact = size === "compact";

    return (
        <div
            data-slot="empty-state"
            data-size={size}
            className={cn(
                "relative isolate flex flex-col items-center overflow-hidden px-6 text-center",
                compact ? "py-10" : "py-16 sm:py-20",
                variant === "panel" && "rounded-panel border border-rule bg-panel",
                className
            )}
            {...props}
        >
            <span
                aria-hidden
                className="hm-empty-field pointer-events-none absolute inset-0 -z-10"
            />

            {icon ? (
                <IconTile
                    aria-hidden
                    size={compact ? "md" : "lg"}
                    className={cn("border border-rule", compact ? "mb-4" : "mb-5")}
                >
                    {icon}
                </IconTile>
            ) : null}

            <div className="flex max-w-sm flex-col items-center">
                <p
                    className={cn(
                        "font-semibold text-foreground",
                        compact ? "text-sm" : "text-lg"
                    )}
                >
                    {title}
                </p>

                {description ? (
                    <p
                        className={cn(
                            "mt-2 text-balance text-muted-foreground",
                            compact ? "text-xs" : "text-sm"
                        )}
                    >
                        {description}
                    </p>
                ) : null}
            </div>

            {actions ? (
                <div
                    className={cn(
                        "flex flex-wrap items-center justify-center gap-2",
                        compact ? "mt-4" : "mt-6"
                    )}
                >
                    {actions}
                </div>
            ) : null}

            {hint ? (
                <div className="mt-7 w-full max-w-sm border-t border-rule pt-4">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        {hint}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

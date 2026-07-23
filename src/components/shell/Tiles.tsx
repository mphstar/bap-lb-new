/* Hallmark · shell · stat + action tiles
 * The reference's quick-action row and right-rail figures, reduced to two
 * primitives. Both are the same panel shape at a smaller scale — nothing here
 * is a second card language.
 */

import { cn } from "@/lib/utils";
import { IconTile } from "./Panel";

interface StatTileProps extends React.ComponentProps<"div"> {
    icon?: React.ReactNode;
    label: React.ReactNode;
    value: React.ReactNode;
    /** One-line qualifier under the figure. Only render real data here. */
    meta?: React.ReactNode;
}

export function StatTile({
    icon,
    label,
    value,
    meta,
    className,
    ...props
}: StatTileProps) {
    return (
        <div
            data-slot="stat-tile"
            className={cn(
                "rounded-panel border border-rule bg-panel p-4",
                className
            )}
            {...props}
        >
            <div className="flex items-center gap-2.5">
                {icon ? <IconTile size="sm">{icon}</IconTile> : null}
                <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                    {label}
                </span>
            </div>

            <p
                data-numeric
                className="mt-3 text-2xl font-semibold leading-none text-foreground"
            >
                {value}
            </p>

            {meta ? (
                <p className="mt-1.5 truncate text-xs text-muted-foreground">{meta}</p>
            ) : null}
        </div>
    );
}

interface ActionTileProps extends Omit<React.ComponentProps<"button">, "title"> {
    icon?: React.ReactNode;
    title: React.ReactNode;
    caption?: React.ReactNode;
}

export function ActionTile({
    icon,
    title,
    caption,
    className,
    ...props
}: ActionTileProps) {
    return (
        <button
            type="button"
            data-slot="action-tile"
            className={cn(
                "group rounded-panel border border-rule bg-panel p-4 text-left",
                "transition-colors duration-[180ms] ease-out",
                "hover:border-foreground/20 hover:bg-panel-2 active:bg-tile",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                className
            )}
            {...props}
        >
            {icon ? <IconTile className="mb-3">{icon}</IconTile> : null}
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {caption ? (
                <p className="truncate text-xs text-muted-foreground">{caption}</p>
            ) : null}
        </button>
    );
}

/* Hallmark · shell · the one card shape
 * Hairline border, 14px radius, no shadow. The old build hand-rolled
 * `bg-card rounded-xl border shadow-sm` in ~20 places and `ui/card` used a
 * different radius, so two card shapes coexisted. This is the single shape.
 */

import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="panel"
            className={cn(
                "rounded-panel border border-rule bg-panel text-card-foreground",
                className
            )}
            {...props}
        />
    );
}

interface PanelHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
    /** 40px neutral rounded-square icon tile, per the reference shell. */
    icon?: React.ReactNode;
    title: React.ReactNode;
    /** Count or one-line status beneath the title. */
    meta?: React.ReactNode;
    /** Right-aligned link or control. */
    action?: React.ReactNode;
    /** Hairline beneath the header. Off for panels whose body is a form. */
    divided?: boolean;
}

export function PanelHeader({
    icon,
    title,
    meta,
    action,
    divided = true,
    className,
    ...props
}: PanelHeaderProps) {
    return (
        <div
            data-slot="panel-header"
            className={cn(
                "flex items-center gap-3 px-5 py-4",
                divided && "border-b border-rule",
                className
            )}
            {...props}
        >
            {icon ? <IconTile>{icon}</IconTile> : null}

            <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-foreground">
                    {title}
                </h2>
                {meta ? (
                    <p className="truncate text-xs text-muted-foreground">{meta}</p>
                ) : null}
            </div>

            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}

export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="panel-body"
            className={cn("p-5", className)}
            {...props}
        />
    );
}

export function PanelFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="panel-footer"
            className={cn(
                "flex flex-wrap items-center gap-2 border-t border-rule px-5 py-3.5",
                className
            )}
            {...props}
        />
    );
}

/** 40px tile carrying a panel's or a tile's icon. This is where the brand hue
 *  lives: the buttons are ink, so without a tinted tile the page has no colour
 *  at all. `tone="neutral"` opts out for avatars and other non-iconographic
 *  marks. */
export function IconTile({
    className,
    size = "md",
    tone = "brand",
    ...props
}: React.ComponentProps<"div"> & {
    size?: "sm" | "md" | "lg";
    tone?: "brand" | "neutral";
}) {
    return (
        <div
            data-slot="icon-tile"
            data-tone={tone}
            className={cn(
                "flex shrink-0 items-center justify-center rounded-tile",
                tone === "brand"
                    ? "bg-brand-soft text-brand"
                    : "bg-tile text-tile-ink",
                size === "lg" && "size-14 rounded-panel [&_svg]:size-6",
                size === "md" && "size-10 [&_svg]:size-[1.125rem]",
                size === "sm" && "size-8 [&_svg]:size-4",
                className
            )}
            {...props}
        />
    );
}

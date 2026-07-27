/* Hallmark · shell · content container
 * One container for every page. The old build used four different max-widths
 * across eleven pages, which is what made the app read as assembled rather
 * than designed.
 *
 * Metrics matched to the reference shell: no max-width cap — the content
 * spans the full column beside the rail, with 40px side padding at desktop
 * (measured 329px from the viewport edge against a 288px rail).
 */

import { cn } from "@/lib/utils";

export function PageShell({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="page-shell"
            className={cn(
                "w-full px-5 pb-16 pt-7 sm:px-8 lg:px-10",
                "print:m-0 print:max-w-none print:p-0",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

/**
 * Vertical rhythm between top-level blocks of a page. Every page stacks its
 * sections through this, so the gap is identical app-wide.
 */
export function PageSections({
    className,
    children,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            {children}
        </div>
    );
}

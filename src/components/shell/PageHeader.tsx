"use client";

/* Hallmark · shell · in-content page header
 * There is no chrome bar in this app. Page identity lives in the content
 * column: title, one meta line, and an optional action cluster on the right.
 * No rule underneath — the gap is the separator.
 *
 * On mobile the sidebar is off-canvas and there is no bar to hang a trigger
 * on, so the header carries it inline, left of the title.
 */

import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
    title: React.ReactNode;
    /** A sentence, or a count ("12 entri"). One line, muted. */
    meta?: React.ReactNode;
    /** Right-aligned cluster. This is where a page's primary action lives —
     *  the rail carries only the one global action. */
    actions?: React.ReactNode;
}

export function PageHeader({
    title,
    meta,
    actions,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <header
            data-slot="page-header"
            className={cn(
                "mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                "print:static print:m-0 print:p-0 print:border-none print:bg-transparent print:hidden",
                className
            )}
            {...props}
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl lg:text-[1.75rem]">
                        {title}
                    </h1>
                    {meta ? (
                        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm truncate">{meta}</p>
                    ) : null}
                </div>
            </div>

            {actions ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            ) : null}
        </header>
    );
}

/* Hallmark · component: brand mark · design-system: design.md
 *
 * Uses the official logo from /newlogo.png with support for light and dark mode styling.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface BapLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    className?: string;
}

export function BapLogo({ className, alt = "BAP System Logo", ...props }: BapLogoProps) {
    return (
        <img
            src="/newlogo.png"
            alt={alt}
            className={cn("shrink-0 object-contain rounded-md transition-transform", className)}
            {...props}
        />
    );
}

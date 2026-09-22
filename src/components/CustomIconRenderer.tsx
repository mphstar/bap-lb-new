import React from "react";
import {
  Link,
  Globe,
  ExternalLink,
  Bookmark,
  Star,
  FileText,
  Layout,
  Layers,
  Compass,
  Share2,
  Lock,
  Sparkles,
  Zap,
  Tag,
  Folder,
  Box,
  Cpu,
  Monitor,
  Database,
  Grid,
} from "lucide-react";

export const CUSTOM_ICON_OPTIONS = [
  { name: "Link", Icon: Link, label: "Tautan" },
  { name: "Globe", Icon: Globe, label: "Web / Globe" },
  { name: "ExternalLink", Icon: ExternalLink, label: "Eksternal" },
  { name: "Bookmark", Icon: Bookmark, label: "Bookmark" },
  { name: "Star", Icon: Star, label: "Bintang" },
  { name: "FileText", Icon: FileText, label: "Dokumen" },
  { name: "Layout", Icon: Layout, label: "Layout" },
  { name: "Layers", Icon: Layers, label: "Layers" },
  { name: "Compass", Icon: Compass, label: "Kompas" },
  { name: "Share2", Icon: Share2, label: "Berbagi" },
  { name: "Lock", Icon: Lock, label: "Privat" },
  { name: "Sparkles", Icon: Sparkles, label: "Sparkles" },
  { name: "Zap", Icon: Zap, label: "Kilat" },
  { name: "Tag", Icon: Tag, label: "Tag" },
  { name: "Folder", Icon: Folder, label: "Folder" },
  { name: "Box", Icon: Box, label: "Box" },
  { name: "Cpu", Icon: Cpu, label: "Sistem" },
  { name: "Monitor", Icon: Monitor, label: "Monitor" },
  { name: "Database", Icon: Database, label: "Database" },
  { name: "Grid", Icon: Grid, label: "Grid" },
];

export function renderCustomIcon(iconName: string, className: string = "size-4") {
  const match = CUSTOM_ICON_OPTIONS.find((i) => i.name.toLowerCase() === (iconName || "").toLowerCase());
  const IconComponent = match ? match.Icon : Link;
  return <IconComponent className={className} />;
}

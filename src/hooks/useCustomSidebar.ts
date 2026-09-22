"use client";

import { useState, useEffect, useCallback } from "react";

export interface CustomSidebarItem {
  id: string;
  userId: string;
  title: string;
  href: string;
  icon: string;
  order: number;
  isPrivate: boolean;
  isOwner?: boolean;
}

export function useCustomSidebar() {
  const [items, setItems] = useState<CustomSidebarItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/custom-sidebar");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to load custom sidebar items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (item: { title: string; href: string; icon: string; order: number; isPrivate: boolean }) => {
    const res = await fetch("/api/custom-sidebar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menambahkan menu");
    }
    await fetchItems();
  };

  const updateItem = async (id: string, item: Partial<{ title: string; href: string; icon: string; order: number; isPrivate: boolean }>) => {
    const res = await fetch("/api/custom-sidebar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...item }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal memperbarui menu");
    }
    await fetchItems();
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/custom-sidebar?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menghapus menu");
    }
    await fetchItems();
  };

  return { items, loading, refresh: fetchItems, addItem, updateItem, deleteItem };
}

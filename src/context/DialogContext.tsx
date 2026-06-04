"use client";

import React, { createContext, useContext, useState } from "react";

interface DialogContextType {
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isConfirm, setIsConfirm] = useState(false);
  const [resolveRef, setResolveRef] = useState<{ resolve: (value: boolean) => void } | null>(null);

  const showAlert = (title: string, message: string) => {
    setTitle(title);
    setMessage(message);
    setIsConfirm(false);
    setIsOpen(true);
  };

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    setTitle(title);
    setMessage(message);
    setIsConfirm(true);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef({ resolve });
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef.resolve(value);
      setResolveRef(null);
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 dark:bg-black/65 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 select-none">
            <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap leading-relaxed">{message}</p>
            <div className="flex justify-end gap-2.5">
              {isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={() => handleClose(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors"
              >
                {isConfirm ? "Konfirmasi" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SignatureContextType {
  dosenSignature: string | null;
  teknisiSignature: string | null;
  setDosenSignature: (sig: string | null) => void;
  setTeknisiSignature: (sig: string | null) => void;
  clearAll: () => void;
}

const SignatureContext = createContext<SignatureContextType | null>(null);

const STORAGE_KEY_DOSEN = "bap_signature_dosen";
const STORAGE_KEY_TEKNISI = "bap_signature_teknisi";

export const SignatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dosenSignature, setDosenSig] = useState<string | null>(null);
  const [teknisiSignature, setTeknisiSig] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY_DOSEN);
      const t = localStorage.getItem(STORAGE_KEY_TEKNISI);
      if (d) setDosenSig(d);
      if (t) setTeknisiSig(t);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const setDosenSignature = useCallback((sig: string | null) => {
    setDosenSig(sig);
    try {
      if (sig) localStorage.setItem(STORAGE_KEY_DOSEN, sig);
      else localStorage.removeItem(STORAGE_KEY_DOSEN);
    } catch {
      // ignore
    }
  }, []);

  const setTeknisiSignature = useCallback((sig: string | null) => {
    setTeknisiSig(sig);
    try {
      if (sig) localStorage.setItem(STORAGE_KEY_TEKNISI, sig);
      else localStorage.removeItem(STORAGE_KEY_TEKNISI);
    } catch {
      // ignore
    }
  }, []);

  const clearAll = useCallback(() => {
    setDosenSig(null);
    setTeknisiSig(null);
    try {
      localStorage.removeItem(STORAGE_KEY_DOSEN);
      localStorage.removeItem(STORAGE_KEY_TEKNISI);
    } catch {
      // ignore
    }
  }, []);

  return (
    <SignatureContext.Provider
      value={{ dosenSignature, teknisiSignature, setDosenSignature, setTeknisiSignature, clearAll }}
    >
      {children}
    </SignatureContext.Provider>
  );
};

export const useSignature = () => {
  const ctx = useContext(SignatureContext);
  if (!ctx) throw new Error("useSignature must be used within <SignatureProvider>");
  return ctx;
};

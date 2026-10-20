"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench
 * design-system: design.md · Superadmin System Settings
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings,
  Cpu,
  RefreshCw,
  KeyRound,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Server,
  Database,
  ShieldCheck,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  Activity,
  Layers,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  PageSections,
  Panel,
  PanelHeader,
  PanelBody,
  StatTile,
} from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface AIModelItem {
  id: string;
  name?: string;
  created?: number;
  owned_by?: string;
}

interface AIConfigData {
  baseUrl: string;
  apiKey: string;
  model: string;
  source: "database" | "env" | "none";
  updatedAt: string | null;
}

interface PresetOption {
  name: string;
  baseUrl: string;
  defaultModel: string;
  description: string;
  placeholderKey: string;
}

const PRESETS: PresetOption[] = [
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    description: "Gateway multi-model terbesar (Claude, GPT-4o, DeepSeek, Llama)",
    placeholderKey: "sk-or-v1-...",
  },
  {
    name: "OpenAI Official",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    description: "Endpoint resmi OpenAI (GPT-4o, GPT-4o-mini, o1-mini)",
    placeholderKey: "sk-proj-...",
  },
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    description: "Inference ultra cepat dengan LPU (Llama 3.3, Mixtral)",
    placeholderKey: "gsk_...",
  },
  {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    description: "Model reasoning & chat ekonomis berakurasi tinggi",
    placeholderKey: "sk-...",
  },
  {
    name: "Ollama (Lokal)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
    description: "Model open-source yang berjalan offline di server/PC lokal",
    placeholderKey: "ollama (opsional)",
  },
  {
    name: "LM Studio (Lokal)",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    description: "Server model lokal via GUI LM Studio",
    placeholderKey: "lm-studio (opsional)",
  },
  {
    name: "9Router",
    baseUrl: "https://api.9router.com/v1",
    defaultModel: "gpt-4o-mini",
    description: "Gateway proxy kompatibel OpenAI",
    placeholderKey: "sk-...",
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userRole = (session?.user as any)?.role || "teknisi";

  // Configuration state
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [source, setSource] = useState<"database" | "env" | "none">("none");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // UI state
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Model Fetching state
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<AIModelItem[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Connection Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    message?: string;
    modelUsed?: string;
    error?: string;
  } | null>(null);

  // Guard: require superadmin
  useEffect(() => {
    if (!sessionPending && (!session?.user || userRole !== "superadmin")) {
      router.push("/dashboard");
    }
  }, [session, sessionPending, userRole, router]);

  // Load config on mount
  const loadConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success && data.config) {
        setBaseUrl(data.config.baseUrl || "");
        setApiKey(data.config.apiKey || "");
        setModel(data.config.model || "gpt-4o-mini");
        setSource(data.config.source || "none");
        setUpdatedAt(data.config.updatedAt);
      }
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setSaveError("Gagal memuat konfigurasi dari server.");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Preset Selection
  const applyPreset = (preset: PresetOption) => {
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    setSaveSuccess(null);
    setSaveError(null);
    setTestResult(null);
  };

  // Fetch available models from endpoint
  const handleFetchModels = async () => {
    if (!baseUrl.trim()) {
      setModelFetchError("Isi Base URL endpoint terlebih dahulu.");
      return;
    }

    try {
      setIsFetchingModels(true);
      setModelFetchError(null);
      setFetchedModels([]);

      const res = await fetch("/api/admin/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menarik daftar model dari endpoint.");
      }

      setFetchedModels(data.models || []);
      if (data.models && data.models.length > 0) {
        setIsModelDropdownOpen(true);
      }
    } catch (err: any) {
      console.error("handleFetchModels error:", err);
      setModelFetchError(err.message || "Gagal mengambil daftar model.");
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ ok: false, error: "Base URL wajib diisi untuk menguji koneksi." });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      const res = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: model.trim() || "gpt-4o-mini",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Koneksi ke endpoint AI gagal.");
      }

      setTestResult({
        ok: true,
        latencyMs: data.latencyMs,
        message: data.message,
        modelUsed: data.modelUsed,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err.message || "Gagal terhubung ke endpoint AI.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      setSaveError("Base URL endpoint tidak boleh kosong.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
          model: model.trim() || "gpt-4o-mini",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan pengaturan.");
      }

      setSaveSuccess("Konfigurasi AI berhasil disimpan dan kini aktif secara global di seluruh aplikasi!");
      setSource("database");
      setUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      setSaveError(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return fetchedModels;
    const q = modelSearch.toLowerCase();
    return fetchedModels.filter(
      (m) => m.id.toLowerCase().includes(q) || (m.name && m.name.toLowerCase().includes(q))
    );
  }, [fetchedModels, modelSearch]);

  if (sessionPending || isLoadingConfig) {
    return (
      <PageShell>
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <RefreshCw className="size-6 animate-spin text-brand" />
            <p className="text-sm font-medium">Memuat pengaturan sistem...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Pengaturan Sistem & AI"
        meta="Kelola integrasi AI kustom dengan protokol OpenAI-compatible dan konfigurasi platform secara terpusat."
        actions={
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 border-brand/40 bg-brand-soft text-brand py-1 px-2.5 text-xs font-semibold"
          >
            <ShieldCheck className="size-3.5" />
            <span>Hak Akses Superadmin</span>
          </Badge>
        }
      />

      <PageSections className="space-y-6">
        {/* Status Indicators */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label="Status AI Provider"
            value={apiKey ? "Aktif" : "Belum Ada Kunci"}
            meta={
              source === "database"
                ? "Tersimpan di Database"
                : source === "env"
                ? "Fallback dari file .env"
                : "Tidak Terkonfigurasi"
            }
          />
          <StatTile
            label="Model Aktif"
            value={model || "gpt-4o-mini"}
            meta={baseUrl ? new URL(baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`).hostname : "Belum diatur"}
          />
          <StatTile
            label="Protokol AI"
            value="OpenAI Compatible"
            meta="Mendukung Ollama, OpenRouter, Groq, dll."
          />
        </div>

        {/* Feedback Alerts */}
        {saveSuccess && (
          <div className="flex items-start gap-3 rounded-panel border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Berhasil Disimpan</p>
              <p>{saveSuccess}</p>
            </div>
          </div>
        )}

        {saveError && (
          <div className="flex items-start gap-3 rounded-panel border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Terjadi Kesalahan</p>
              <p>{saveError}</p>
            </div>
          </div>
        )}

        {/* Main Settings Form */}
        <form onSubmit={handleSaveSettings}>
          <Panel>
            <PanelHeader
              title="Integrasi Endpoint AI (OpenAI-Compatible)"
              meta="Konfigurasi alamat endpoint REST API dan kredensial API Key untuk mendukung asisten AI cerdas dan parsing jadwal otomatis."
            />
            <PanelBody className="space-y-6">
              {/* Presets Bar */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Preset Penyedia Cepat (Quick Presets)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((preset) => {
                    const isSelected = baseUrl.replace(/\/+$/, "") === preset.baseUrl.replace(/\/+$/, "");
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium border transition-all ${
                          isSelected
                            ? "bg-brand text-brand-foreground border-brand shadow-xs font-semibold"
                            : "bg-panel border-rule text-foreground hover:bg-panel-2 hover:border-brand/30"
                        }`}
                      >
                        <Sparkles className="size-3" />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint Base URL Field */}
              <div>
                <label
                  htmlFor="baseUrl"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  API Base URL Endpoint <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Globe className="size-4" />
                  </div>
                  <Input
                    id="baseUrl"
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1 atau http://localhost:11434/v1"
                    className="pl-9 font-mono text-xs"
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  URL induk layanan AI. Permintaan akan diarahkan ke{" "}
                  <code className="text-xs bg-panel-2 px-1 py-0.5 rounded border border-rule font-mono">
                    {baseUrl ? `${baseUrl.replace(/\/+$/, "")}/chat/completions` : ".../chat/completions"}
                  </code>
                </p>
              </div>

              {/* API Key Field */}
              <div>
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-semibold text-foreground mb-1.5"
                >
                  API Key / Secret Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <KeyRound className="size-4" />
                  </div>
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pl-9 pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                    title={showApiKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Untuk provider lokal seperti Ollama, API Key dapat dikosongkan atau diisi sembarang karakter jika tidak memerlukan otentikasi.
                </p>
              </div>

              {/* Model Fetching and Selection */}
              <div className="rounded-panel border border-rule bg-panel-2 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Cpu className="size-4 text-brand" />
                      <span>Model AI Default</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pilih dari daftar model yang tersedia atau masukkan ID model secara manual.
                    </p>
                  </div>

                  {/* Fetch Models Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels || !baseUrl.trim()}
                    className="shrink-0 flex items-center gap-2 text-xs font-semibold border-brand/30 hover:bg-brand-soft hover:text-brand"
                  >
                    {isFetchingModels ? (
                      <RefreshCw className="size-3.5 animate-spin text-brand" />
                    ) : (
                      <RefreshCw className="size-3.5 text-brand" />
                    )}
                    <span>Tarik Model yang Tersedia</span>
                  </Button>
                </div>

                {/* Model Fetch Error */}
                {modelFetchError && (
                  <div className="rounded-control bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{modelFetchError}</span>
                  </div>
                )}

                {/* Model Input with Dropdown */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="gpt-4o-mini, llama3, deepseek-chat, dll."
                      className="font-mono text-xs pr-8"
                    />
                    {fetchedModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Fetched Models Dropdown Selector */}
                  {fetchedModels.length > 0 && isModelDropdownOpen && (
                    <div className="rounded-panel border border-rule bg-panel shadow-lg p-2 max-h-60 overflow-y-auto space-y-1">
                      <div className="relative mb-2">
                        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Cari model dalam daftar..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          className="h-7 text-xs pl-8 font-normal"
                        />
                      </div>

                      <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                        Ditemukan {filteredModels.length} model dari endpoint:
                      </div>

                      <div className="space-y-0.5">
                        {filteredModels.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setModel(item.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-control text-xs font-mono transition-colors flex items-center justify-between ${
                              model === item.id
                                ? "bg-brand-soft text-brand font-semibold"
                                : "text-foreground hover:bg-panel-2"
                            }`}
                          >
                            <span className="truncate">{item.id}</span>
                            {item.owned_by && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2 font-sans">
                                {item.owned_by}
                              </span>
                            )}
                          </button>
                        ))}
                        {filteredModels.length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                            Tidak ada model yang cocok dengan kata kunci &quot;{modelSearch}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {fetchedModels.length > 0 && !isModelDropdownOpen && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        {fetchedModels.length} model siap dipilih
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(true)}
                        className="text-brand hover:underline text-xs"
                      >
                        Buka pilihan model
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons & Testing */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-rule">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !baseUrl.trim()}
                    className="flex items-center gap-2 text-xs font-semibold"
                  >
                    {isTesting ? (
                      <RefreshCw className="size-3.5 animate-spin text-brand" />
                    ) : (
                      <Zap className="size-3.5 text-amber-500" />
                    )}
                    <span>Uji Koneksi AI</span>
                  </Button>

                  {testResult && (
                    <div
                      className={`text-xs px-2.5 py-1.5 rounded-control flex items-center gap-1.5 ${
                        testResult.ok
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {testResult.ok ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            Terhubung ({testResult.latencyMs}ms) &mdash; {testResult.modelUsed}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="size-3.5 text-destructive" />
                          <span className="truncate max-w-[280px]" title={testResult.error}>
                            {testResult.error}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSaving || !baseUrl.trim()}
                  className="flex items-center gap-2 font-semibold"
                >
                  {isSaving ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  <span>Simpan Perubahan</span>
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </form>

        {/* System & Architecture Info Card */}
        <Panel>
          <PanelHeader
            title="Informasi Lingkungan & Database"
            meta="Detail status operasional server, basis data, dan akun superadmin."
          />
          <PanelBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-control bg-panel-2 border border-rule">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  Database Lokal
                </span>
                <span className="font-semibold text-foreground">PostgreSQL (bap_lb)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-control bg-panel-2 border border-rule">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" />
                  Akun Superadmin
                </span>
                <span className="font-semibold text-foreground">{session?.user?.email || "-"}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-control bg-panel-2 border border-rule">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Server className="size-4 text-emerald-500" />
                  Server Framework
                </span>
                <span className="font-semibold text-foreground">Next.js 15 (App Router)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-control bg-panel-2 border border-rule">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Activity className="size-4 text-blue-500" />
                  Pembaruan Terakhir
                </span>
                <span className="font-semibold text-foreground">
                  {updatedAt ? new Date(updatedAt).toLocaleString("id-ID") : "Belum pernah diperbarui"}
                </span>
              </div>
            </div>
          </PanelBody>
        </Panel>
      </PageSections>
    </PageShell>
  );
}

// [OI]-compatible AI client (supports OpenAI, OpenRouter, Groq, Ollama, DeepSeek, LocalAI, etc.)
import { db, systemSettings } from "@/db";
import { eq } from "drizzle-orm";

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  url: string; // ${baseUrl}/chat/completions
  model: string;
  source: "database" | "env" | "none";
}

export interface OpenAIModelItem {
  id: string;
  name?: string;
  created?: number;
  owned_by?: string;
}

let cachedAIConfig: { config: AIConfig; timestamp: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10s cache to avoid querying db on every SSE delta

export async function getAIConfig(forceRefresh = false): Promise<AIConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedAIConfig && now - cachedAIConfig.timestamp < CACHE_TTL_MS) {
    return cachedAIConfig.config;
  }

  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai_config"))
      .limit(1);

    if (row && row.value && typeof row.value === "object") {
      const val = row.value as { baseUrl?: string; apiKey?: string; model?: string };
      if (val.apiKey && val.apiKey.trim()) {
        const baseUrl = (val.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
        const model = val.model?.trim() || "gpt-4o-mini";
        const config: AIConfig = {
          apiKey: val.apiKey.trim(),
          baseUrl,
          url: `${baseUrl}/chat/completions`,
          model,
          source: "database",
        };
        cachedAIConfig = { config, timestamp: now };
        return config;
      }
    }
  } catch (err) {
    console.warn("Failed to read systemSettings for AI config:", err);
  }

  // Fallback to environment variables
  const envKey = process.env.OPENAI_API_KEY?.trim() || "";
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.9router.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const config: AIConfig = {
    apiKey: envKey,
    baseUrl,
    url: `${baseUrl}/chat/completions`,
    model,
    source: envKey ? "env" : "none",
  };
  cachedAIConfig = { config, timestamp: now };
  return config;
}

export function clearAIConfigCache() {
  cachedAIConfig = null;
}

export async function isAIConfigured(): Promise<boolean> {
  const config = await getAIConfig();
  return Boolean(config.apiKey && config.apiKey.length > 0);
}

/**
 * Fetch available models from an OpenAI-compatible /models endpoint
 */
export async function fetchAvailableModels(
  baseUrl: string,
  apiKey: string
): Promise<OpenAIModelItem[]> {
  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const modelsUrl = `${cleanBase}/models`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  const res = await fetch(modelsUrl, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 200);
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch {}
    throw new Error(`Gagal mengambil daftar model (${res.status}): ${detail}`);
  }

  const json = await res.json();
  let list: OpenAIModelItem[] = [];

  // 1. Standard OpenAI format: { object: 'list', data: [{ id: '...', ... }] }
  if (Array.isArray(json?.data)) {
    list = json.data.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || m.id,
      created: m.created,
      owned_by: m.owned_by,
    }));
  }
  // 2. Ollama / custom format: { models: [{ name: '...', ... }] }
  else if (Array.isArray(json?.models)) {
    list = json.models.map((m: any) => ({
      id: m.name || m.id,
      name: m.name || m.id,
      created: m.created_at ? new Date(m.created_at).getTime() / 1000 : undefined,
    }));
  }
  // 3. Array root: [{ id: '...' }]
  else if (Array.isArray(json)) {
    list = json.map((m: any) => ({
      id: typeof m === "string" ? m : m.id || m.name,
      name: typeof m === "string" ? m : m.name || m.id,
    }));
  }

  return list
    .filter((m) => Boolean(m.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Sends a minimal test ping to verify end-to-end OpenAI compatibility
 */
export async function testAIConnection(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<{ ok: boolean; latencyMs: number; message: string; modelUsed: string }> {
  const start = Date.now();
  const cleanBase = params.baseUrl.trim().replace(/\/+$/, "");
  const url = `${cleanBase}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (params.apiKey && params.apiKey.trim()) {
    headers["Authorization"] = `Bearer ${params.apiKey.trim()}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: params.model || "gpt-4o-mini",
      messages: [
        { role: "user", content: "Ping! Tolong respon dengan kata 'Connected'." },
      ],
      max_tokens: 20,
      temperature: 0.1,
    }),
  });

  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = errText.slice(0, 250);
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.error?.message) errMsg = errJson.error.message;
    } catch {}
    throw new Error(`Uji koneksi gagal (${res.status}): ${errMsg}`);
  }

  const json = await res.json();
  const reply = json.choices?.[0]?.message?.content || "Connected!";
  return {
    ok: true,
    latencyMs,
    message: reply.trim(),
    modelUsed: json.model || params.model,
  };
}

/**
 * Lowercases schema "type" values (e.g. "OBJECT" -> "object") so tool
 * parameters match [OI] JSON Schema format.
 */
function normalizeSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map(normalizeSchema);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string") {
      result[key] = value.toLowerCase();
    } else if (typeof value === "object" && value !== null) {
      result[key] = normalizeSchema(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Reads a streaming [OI]-compatible SSE response chunk by chunk.
 */
async function streamCompletion(
  res: Response,
  onDelta?: (deltaText: string) => void
): Promise<{ message: any }> {
  if (!res.body) {
    throw new Error("Respons stream tidak tersedia.");
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") && !contentType.includes("application/x-ndjson")) {
    const text = await res.text();
    if (text.trimStart().startsWith("<")) {
      throw new Error("Layanan AI mengembalikan respons HTML (kemungkinan timeout atau gateway error). Silakan coba lagi.");
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Format respons AI tidak valid: ${text.slice(0, 150)}`);
    }
    if (data?.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    const choice = data?.choices?.[0];
    const msg = choice?.message || { role: "assistant", content: data?.reply || "" };
    if (msg.content && onDelta) {
      onDelta(msg.content);
    }
    return { message: msg };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  const toolCalls: Record<number, any> = {};
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let chunk: any;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      if (choice.delta?.content) {
        content += choice.delta.content;
        if (onDelta) {
          onDelta(choice.delta.content);
        }
      } else if (choice.delta?.text) {
        content += choice.delta.text;
        if (onDelta) {
          onDelta(choice.delta.text);
        }
      }

      for (const tc of choice.delta?.tool_calls || []) {
        const idx = tc.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = {
            id: "",
            type: "function",
            function: { name: "", arguments: "" },
          };
        }
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
      }
    }
  }

  const toolCallsList = Object.values(toolCalls).filter(Boolean);

  return {
    message: {
      role: "assistant",
      content,
      ...(toolCallsList.length ? { tool_calls: toolCallsList } : {}),
    },
  };
}

/**
 * Reads an [OI]-compatible response. Handles both plain JSON and SSE
 * (`data: {...}`) streams, since some gateways stream regardless of `stream: false`.
 */
async function readCompletion(res: Response): Promise<any> {
  const text = await res.text();

  if (text.trimStart().startsWith("<")) {
    throw new Error("Layanan AI mengembalikan halaman HTML. Silakan coba kembali sesaat lagi.");
  }

  if (!text.trimStart().startsWith("data:")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Respons AI bukan JSON valid: ${text.slice(0, 100)}`);
    }
  }

  let content = "";
  let finishReason: string | undefined;
  let id: string | undefined;
  let model: string | undefined;
  const toolCalls: any[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    let chunk: any;
    try {
      chunk = JSON.parse(payload);
    } catch {
      continue;
    }

    id = chunk.id ?? id;
    model = chunk.model ?? model;
    const choice = chunk.choices?.[0];
    if (!choice) continue;

    if (choice.delta?.content) content += choice.delta.content;
    if (choice.finish_reason) finishReason = choice.finish_reason;

    for (const tc of choice.delta?.tool_calls || []) {
      const idx = tc.index ?? 0;
      toolCalls[idx] ||= {
        id: "",
        type: "function",
        function: { name: "", arguments: "" },
      };
      if (tc.id) toolCalls[idx].id = tc.id;
      if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
      if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
    }
  }

  return {
    id,
    model,
    choices: [
      {
        finish_reason: finishReason,
        message: {
          role: "assistant",
          content,
          ...(toolCalls.length ? { tool_calls: toolCalls.filter(Boolean) } : {}),
        },
      },
    ],
  };
}

export async function parseScheduleWithAI(rawText: string) {
  const { apiKey, url, model } = await getAIConfig();

  const systemPrompt = `Anda adalah asisten data akademik profesional. Ekstrak data jadwal perkuliahan / praktikum dari teks tidak terstruktur menjadi JSON array murni tanpa markdown/penjelasan tambahan.
Format JSON yang diharapkan adalah array dari objek:
[
  {
    "mataKuliah": "Nama mata kuliah",
    "hari": "Senin / Selasa / Rabu / Kamis / Jumat / Sabtu / Minggu",
    "jam": "07.00 - 09.30",
    "tempat": "Lab RPL / Ruang Kelas",
    "prodi": "TIF / MIF / TKK",
    "semester": "2 / 4 / 6",
    "golongan": "A / B / C",
    "defaultPengajar": "Nama Dosen",
    "defaultTeknisi": "Nama Teknisi"
  }
]
Wajib hanya mengembalikan JSON array murni.`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Ekstrak jadwal dari teks berikut:\n\n${rawText}` },
      ],
      temperature: 0.1,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const cleanErr = errText.trimStart().startsWith("<")
      ? `Layanan AI mengalami kendala HTTP ${res.status}. Silakan coba sesaat lagi.`
      : errText;
    throw new Error(`AI API error (${res.status}): ${cleanErr}`);
  }

  const json = await readCompletion(res);
  const rawContent = json.choices?.[0]?.message?.content || "[]";

  // Clean markdown code fence if present (e.g. ```json ... ```)
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`AI mengembalikan format bukan JSON: ${cleaned.slice(0, 150)}`);
  }
}

export async function chatWithAI(params: {
  messages: Array<{ role: string; content: string }>;
  systemInstruction: string;
  tools: any[];
  executeFunction: (name: string, args: any) => Promise<any>;
  onDelta?: (deltaText: string) => void;
}) {
  const { apiKey, url, model } = await getAIConfig();

  const aiTools = params.tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: normalizeSchema(t.parameters),
    },
  }));

  const conversation: any[] = [
    { role: "system", content: params.systemInstruction },
    ...params.messages.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  let turns = 0;
  const maxTurns = 10;

  while (turns < maxTurns) {
    turns++;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: conversation,
        tools: aiTools,
        tool_choice: "auto",
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const cleanErr = errText.trimStart().startsWith("<")
        ? `Layanan AI mengalami kendala HTTP ${res.status}. Silakan coba sesaat lagi.`
        : errText;
      throw new Error(`AI Chat API error (${res.status}): ${cleanErr}`);
    }

    const { message } = await streamCompletion(res, params.onDelta);

    if (!message) {
      throw new Error("Tidak ada respons yang diterima dari AI.");
    }

    conversation.push(message);

    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return message.content || "Tidak ada jawaban.";
    }

    // Execute tool calls
    for (const toolCall of toolCalls) {
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
      }

      const result = await params.executeFunction(toolCall.function.name, args);

      conversation.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  // If max turns reached but the last message was a tool execution,
  // do ONE final turn without tools so the AI synthesizes and answers the user's question!
  const lastMsg = conversation[conversation.length - 1];
  if (lastMsg?.role === "tool" || (lastMsg?.role === "assistant" && lastMsg?.tool_calls?.length)) {
    try {
      const finalRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            ...conversation,
            {
              role: "user",
              content:
                "Berdasarkan seluruh data yang telah Anda kumpulkan dari fungsi/tool sebelumnya, berikan jawaban dan analisis lengkap serta terstruktur atas pertanyaan awal pengguna sekarang tanpa memanggil fungsi lagi.",
            },
          ],
          temperature: 0.3,
          stream: true,
        }),
      });

      if (finalRes.ok) {
        const { message: finalMsg } = await streamCompletion(finalRes, params.onDelta);
        if (finalMsg?.content && finalMsg.content.trim()) {
          return finalMsg.content;
        }
      }
    } catch (e) {
      console.error("Failed to generate final synthesis answer:", e);
    }
  }

  const finalMessage = "Data telah selesai dianalisis.";
  if (params.onDelta) {
    params.onDelta(finalMessage);
  }
  return finalMessage;
}

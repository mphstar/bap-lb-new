// DeepSeek API Client (OpenAI-compatible)
// Platform: https://platform.deepseek.com/

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim());
}

/**
 * Normalizes Google GenAI schemas (uppercase Types like "STRING", "OBJECT")
 * into OpenAI/DeepSeek-compliant JSON Schema format (lowercase "string", "object", etc.)
 */
function normalizeSchemaToOpenAI(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map(normalizeSchemaToOpenAI);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string") {
      result[key] = value.toLowerCase();
    } else if (typeof value === "object" && value !== null) {
      result[key] = normalizeSchemaToOpenAI(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export async function parseScheduleWithDeepSeek(rawText: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi di .env");
  }

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

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Ekstrak jadwal dari teks berikut:\n\n${rawText}` },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const rawContent = json.choices?.[0]?.message?.content || "[]";

  // Clean markdown code fence if present (e.g. ```json ... ```)
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export async function chatWithDeepSeek(params: {
  messages: Array<{ role: string; content: string }>;
  systemInstruction: string;
  tools: any[];
  executeFunction: (name: string, args: any) => Promise<any>;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi di .env");
  }

  // Convert and sanitize tools to OpenAI / DeepSeek JSON Schema format
  const deepseekTools = params.tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: normalizeSchemaToOpenAI(t.parameters),
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
  const maxTurns = 5;

  while (turns < maxTurns) {
    turns++;

    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: conversation,
        tools: deepseekTools,
        tool_choice: "auto",
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek Chat API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const message = json.choices?.[0]?.message;

    if (!message) {
      throw new Error("Tidak ada respons yang diterima dari DeepSeek.");
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

  return "Selesai memproses data.";
}

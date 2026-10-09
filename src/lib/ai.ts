// [OI]-compatible AI client (works with 9router gateway and any compatible endpoint).

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("OPENAI_API_KEY belum dikonfigurasi di .env");
  }
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.9router.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return { apiKey, url: `${baseUrl}/chat/completions`, model };
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
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

  if (!text.trimStart().startsWith("data:")) {
    return JSON.parse(text);
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
  const { apiKey, url, model } = getConfig();

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
    throw new Error(`AI API error (${res.status}): ${errText}`);
  }

  const json = await readCompletion(res);
  const rawContent = json.choices?.[0]?.message?.content || "[]";

  // Clean markdown code fence if present (e.g. ```json ... ```)
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export async function chatWithAI(params: {
  messages: Array<{ role: string; content: string }>;
  systemInstruction: string;
  tools: any[];
  executeFunction: (name: string, args: any) => Promise<any>;
  onDelta?: (deltaText: string) => void;
}) {
  const { apiKey, url, model } = getConfig();

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
  const maxTurns = 8;

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
      throw new Error(`AI Chat API error (${res.status}): ${errText}`);
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

  const finalMessage = "Selesai memproses data.";
  if (params.onDelta) {
    params.onDelta(finalMessage);
  }
  return finalMessage;
}

import { NextRequest, NextResponse } from "next/server";
import { OllamaProvider, OpenAICompatibleProvider, OfflineProvider } from "@repopilot/ai";
import { rateLimiter, getClientIp } from "@/lib/rateLimiter";
import { validateAiEndpoint } from "@/lib/security";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const limitCheck = rateLimiter.check(`ai:capabilities:${clientIp}`, 60, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${limitCheck.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  // 1. Check local Ollama status
  const { searchParams } = new URL(req.url);
  const ollamaUrl = searchParams.get("ollamaUrl") || "http://localhost:11434";
  const ollamaValidation = await validateAiEndpoint(ollamaUrl, { allowLoopbackOllama: true });

  let ollamaAvailable = false;
  let ollamaModels: string[] = [];
  let ollamaError: string | undefined;

  if (ollamaValidation.valid) {
    try {
      const ollama = new OllamaProvider(ollamaUrl);
      const status = await ollama.isAvailable();
      ollamaAvailable = status.available;
      ollamaModels = status.models || [];
      ollamaError = status.error;
    } catch (e: any) {
      ollamaError = e.message;
    }
  } else {
    ollamaError = ollamaValidation.reason;
  }

  // 2. Check OpenAI-compatible BYO-key status if provided in headers
  const customApiKey = req.headers.get("x-ai-key");
  const customBaseUrl = req.headers.get("x-ai-base-url") || "https://api.openai.com/v1";
  let customAvailable = false;
  let customError: string | undefined;

  if (customApiKey) {
    const customValidation = await validateAiEndpoint(customBaseUrl, { allowLoopbackOllama: false });
    if (customValidation.valid) {
      const customProvider = new OpenAICompatibleProvider({
        baseUrl: customBaseUrl,
        apiKey: customApiKey
      });
      const customStatus = await customProvider.isAvailable();
      customAvailable = customStatus.available;
      customError = customStatus.error;
    } else {
      customError = customValidation.reason;
    }
  }

  return NextResponse.json({
    providers: {
      ollama: {
        type: "ollama",
        name: "Local Ollama",
        available: ollamaAvailable,
        endpoint: ollamaUrl,
        models: ollamaModels,
        error: ollamaError,
        description: "Zero-cost local inference via Ollama. Requires Ollama running on your local device."
      },
      "openai-compatible": {
        type: "openai-compatible",
        name: "OpenAI-Compatible (BYO Key)",
        available: customAvailable,
        configured: Boolean(customApiKey),
        requiresKey: true,
        error: customError,
        description: "Bring-your-own-key for OpenAI, Groq, Together, OpenRouter, or DeepSeek. Stored in sessionStorage only."
      },
      offline: {
        type: "offline",
        name: "Offline (Deterministic Only)",
        available: true,
        description: "Deterministic AST & lexical search with verified citations. Always available with 100% reliability."
      }
    },
    activeMode: customAvailable
      ? "openai-compatible"
      : ollamaAvailable
      ? "ollama"
      : "offline"
  });
}

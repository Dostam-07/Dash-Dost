import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

// Dynamic check of active provider model
const getActiveProvider = () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim() !== "") {
    return {
      provider: "gemini" as const,
      providerName: "Google Gemini (gemini-flash-latest)",
      isConfigured: true
    };
  } else if (openRouterKey && openRouterKey !== "MY_OPENROUTER_API_KEY" && openRouterKey.trim() !== "") {
    return {
      provider: "openrouter" as const,
      providerName: "OpenRouter (Claude 3.5 Sonnet)",
      isConfigured: true
    };
  } else {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "llama3.1";
    return {
      provider: "ollama" as const,
      providerName: `Ollama Local (${ollamaModel})`,
      isConfigured: !!process.env.OLLAMA_BASE_URL
    };
  }
};

const getGeminiClient = () => {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const getOpenRouterClient = () => {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://ai.studio/build",
      "X-Title": "Dash-Dost Dashboard Builder",
    }
  });
};

const getOllamaClient = () => {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  return new OpenAI({
    apiKey: "ollama",
    baseURL: `${ollamaUrl}/v1`
  });
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const active = getActiveProvider();
    res.json({ status: "healthy", provider: active.providerName, apiKeyConfigured: active.isConfigured });
  });

  // Streaming Content Generation proxy
  app.post("/api/generate", async (req, res) => {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const active = getActiveProvider();

    try {
      // Construct system instruction that strictly forces conformance to the visual layout JSON schema
      const systemInstruction = `You are a highly structured, precise analytical engineer acting as the visual layout compiler for Dash-Dost Dashboard Builder.

Your purpose is to interpret natural language data descriptions into a flawless JSON specification that fully conforms to the MasterDashboardPayloadSchema.

Core Operations Directives:
1. Output MUST be strictly valid, pure JSON. Do not write introductory sentences, markdown blocks wrapper syntax like \`\`\`json or \`\`\`, or any surrounding text that invalidates a parser engine. Your response must begin with { and end with }.
2. Data Realism: Generate contextually relevant, dense mock datasets within the "seriesData" array in each component.
   - For Saas dashboards, include fields like revenue, churn, users, date (format: "YYYY-MM-DD" e.g. "2026-06-01" to "2026-06-30"), category, etc.
   - For Marketing, include clicks, impressions, conversionRate, cost, platform, adGroup, date.
   - Ensure these field keys line up EXACTLY with config.xAxisKey and config.yAxisKeys for that component.
3. Progressive Intent Alignment: Distribute components intelligently across layouts using the 12-column layout object (sm:12, md:6, lg:4 or lg:3 for KPIs; sm:12, lg:6 or lg:12 for charts).
4. Responsive Layouts:
   - "layout" has properties sm, md, lg. These are column numbers out of 12.
   - For 'kpi_card' (KPI block): sm: 12, md: 6, lg: 3 is recommended.
   - For other charts: sm: 12, md: 12, lg: 6 or lg: 12 is recommended.
5. Interactive Filter Provisioning: Always include filters at the "filters" array level. Create target filters mapping to target keys fields (e.g. key "category" or "date").
   - Filter types are 'date_range' or 'category_select'.
   - 'targetKeys' is an array of data field strings inside component seriesData (e.g. ["category"] or ["date"]) that this filter will restrict.
   - If 'category_select' is used, provide standard filter options array of strings (e.g. ["North", "South", "East", "West"] or brands/categories). This option is critical for local interactive filtering.
6. Support different chart types: 'kpi_card', 'bar_chart', 'line_chart', 'area_chart', 'pie_chart', 'scatter_chart', 'map_chart', 'geo_map'.
   - 'kpi_card' config should have: "kpiValue": string format (e.g. "$12,450", "94.2%"), "kpiTrend": { "direction": "up" | "down" | "neutral", "label": "+12% MoM" }
   - 'bar_chart', 'line_chart', 'area_chart', 'scatter_chart', 'map_chart', 'geo_map' config should specify: "xAxisKey" (usually "date" or "category") and "yAxisKeys" (array of numerical field names to map e.g. ["revenue", "costs"]). Keep stacked: boolean optional.
   - For 'map_chart' and 'geo_map', default to realistically populated datasets representing Indian states (e.g. Maharashtra, Karnataka, Delhi, etc.) or World countries, NOT US states.
   - Include realistic generated seriesData in EACH component (an array of 10-24 object rows tracking coordinates/metrics, e.g. { "date": "2026-06-01", "revenue": 1000, "costs": 400, "category": "Enterprise" }).
7. Be responsive to iterative user requests if history is provided. Integrate the conversational history context when editing, refining, or appending to the current dashboard. However, if the user uploads a NEW dataset or asks for a NEW dashboard, generate a completely fresh dashboard and do NOT carry over previous components unless explicitly requested.`;

      if (active.provider === "gemini") {
        const ai = getGeminiClient();
        const contents: any[] = [];
        
        if (history && history.length > 0) {
          history.forEach((msg: any) => {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            });
          });
        }
        
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });

        // Retry stream initiation if encountering 503 or demand issues
        let stream: any = null;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
          try {
            stream = await ai.models.generateContentStream({
              model: "gemini-3.1-flash-lite",
              contents,
              config: {
                systemInstruction,
                temperature: 0.1,
              }
            });
            break; // Success! Break retry loop
          } catch (error: any) {
            retries--;
            const errorString = String(error?.message || error || "");
            const is503 = errorString.includes("503") || 
                          errorString.toLowerCase().includes("unavailable") || 
                          errorString.toLowerCase().includes("high demand") || 
                          errorString.toLowerCase().includes("temporary") ||
                          error?.status === 503 ||
                          error?.code === 503;

            if (is503 && retries > 0) {
              console.warn(`[Gemini Retry] /api/generate failed with 503/High Demand. Retrying in ${delay}ms... (${retries} attempts left)`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay = Math.floor(delay * 1.5);
            } else {
              throw error; // Not 503, or no retries left, throw it
            }
          }
        }

        // Successfully acquired stream, now set headers
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            res.write(text);
          }
        }
      } else {
        const client = active.provider === "openrouter" ? getOpenRouterClient() : getOllamaClient();
        const model = active.provider === "openrouter" ? "anthropic/claude-3.5-sonnet" : (process.env.OLLAMA_MODEL || "llama3.1");

        const messages: any[] = [
          { role: "system", content: systemInstruction }
        ];

        if (history && history.length > 0) {
          history.forEach((msg: any) => {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content
            });
          });
        }

        messages.push({ role: "user", content: prompt });

        const stream = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.1,
          stream: true,
        });

        // Set headers right before writing to stream
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            res.write(text);
          }
        }
      }
      res.end();
    } catch (error: any) {
      console.error(`Error generating content with ${active.providerName}:`, error);
      
      const errorString = String(error?.message || error || "");
      const is503 = errorString.includes("503") || 
                    errorString.toLowerCase().includes("unavailable") || 
                    errorString.toLowerCase().includes("high demand") || 
                    errorString.toLowerCase().includes("temporary") ||
                    error?.status === 503 ||
                    error?.code === 503;

      let friendlyMessage = error?.message || "Something went wrong while generating details. Check server connection.";
      if (is503) {
        friendlyMessage = "Google Gemini is currently experiencing temporary high demand (553 Unavailable). Please click an Idea Template above to use pre-compiled visual assets, or try clicking Send again in a few seconds!";
      }

      if (!res.headersSent) {
        res.status(503).json({ error: friendlyMessage });
      } else {
        res.write(`\n\n[ERROR: ${friendlyMessage}]`);
        res.end();
      }
    }
  });

  // AI Insights generation endpoint
  app.post("/api/insights", async (req, res) => {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ error: "Dashboard payload is required" });
    }

    const active = getActiveProvider();

    try {
      const summaryContext = {
        title: payload.title,
        subtitle: payload.subtitle || "",
        components: (payload.components || []).map((c: any) => ({
          title: c.title,
          type: c.type,
          data: (c.seriesData || []).slice(0, 15)
        }))
      };

      const systemInstruction = "You are a professional business intelligence advisor and expert data analyst. Generate short, clear, highly structured and valuable summaries and actionable recommendation items.";
      const prompt = `Given this active dashboard: ${JSON.stringify(summaryContext)}. Please write a brief, elegant analytical executive summary (max 3 sentences) and exactly 3 high-impact actionable business recommendations (bullet points). Keep layout professional and easy to scan using standard Markdown.`;

      if (active.provider === "gemini") {
        const ai = getGeminiClient();
        let response: any = null;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.2,
              }
            });
            break;
          } catch (error: any) {
            retries--;
            const errorString = String(error?.message || error || "");
            const is503 = errorString.includes("503") || 
                          errorString.toLowerCase().includes("unavailable") || 
                          errorString.toLowerCase().includes("high demand") || 
                          errorString.toLowerCase().includes("temporary") ||
                          error?.status === 503 ||
                          error?.code === 503;

            if (is503 && retries > 0) {
              console.warn(`[Gemini Retry] /api/insights failed with 503/High Demand. Retrying in ${delay}ms... (${retries} attempts left)`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay = Math.floor(delay * 1.5);
            } else {
              throw error;
            }
          }
        }

        res.json({ insights: response.text || "" });
      } else {
        const client = active.provider === "openrouter" ? getOpenRouterClient() : getOllamaClient();
        const model = active.provider === "openrouter" ? "anthropic/claude-3.5-sonnet" : (process.env.OLLAMA_MODEL || "llama3.1");

        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
        });

        res.json({ insights: response.choices[0]?.message?.content || "" });
      }
    } catch (error: any) {
      console.error(`Insights Generation Error with ${active.providerName}:`, error);

      const errorString = String(error?.message || error || "");
      const is503 = errorString.includes("503") || 
                    errorString.toLowerCase().includes("unavailable") || 
                    errorString.toLowerCase().includes("high demand") || 
                    errorString.toLowerCase().includes("temporary") ||
                    error?.status === 503 ||
                    error?.code === 503;

      let friendlyMessage = error?.message || "Insights Generation Failed";
      if (is503) {
        friendlyMessage = "Google Gemini is currently experiencing temporary high demand. Failed to generate live insights at this moment.";
      }

      res.status(503).json({ error: friendlyMessage });
    }
  });

  // Vite Integration
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${isProd ? "production" : "development"} mode.`);
  });
}

startServer();

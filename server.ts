import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

// Initialize Google GenAI on the server
// Set User-Agent headers to 'aistudio-build' in httpOptions for telemetry
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", apiKeyConfigured: !!apiKey });
  });

  // Streaming Gemini Content Generation proxy
  app.post("/api/generate", async (req, res) => {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.",
      });
    }

    try {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Transfer-Encoding", "chunked");

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
   - Include realistic generated seriesData in EACH component (an array of 10-24 object rows tracking coordinates/metrics, e.g. { "date": "2026-06-01", "revenue": 1000, "costs": 400, "category": "Enterprise" }).
7. Be responsive to iterative user requests if history is provided. Integrate the conversational history context when editing, refining, or appending to the current dashboard. However, if the user uploads a NEW dataset or asks for a NEW dashboard, generate a completely fresh dashboard and do NOT carry over previous components unless explicitly requested.`;

      // Construct conversational contents
      const contentsList: any[] = [];
      if (history && history.length > 0) {
        history.forEach((msg: any) => {
          contentsList.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        });
      }
      contentsList.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: contentsList,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1, // low temperature to ensure highly coherent JSON
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
    } catch (error: any) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // AI Insights generation endpoint via server-side Gemini
  app.post("/api/insights", async (req, res) => {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ error: "Dashboard payload is required" });
    }
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.",
      });
    }

    try {
      const summaryContext = {
        title: payload.title,
        subtitle: payload.subtitle || "",
        components: (payload.components || []).map((c: any) => ({
          title: c.title,
          type: c.type,
          data: (c.seriesData || []).slice(0, 15) // slice to keep within token limits
        }))
      };

      const systemInstruction = "You are a professional business intelligence advisor and expert data analyst. Generate short, clear, highly structured and valuable summaries and actionable recommendation items.";
      const prompt = `Given this active dashboard: ${JSON.stringify(summaryContext)}. Please write a brief, elegant analytical executive summary (max 3 sentences) and exactly 3 high-impact actionable business recommendations (bullet points). Keep layout professional and easy to scan using standard Markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("Insights Generation Error:", error);
      res.status(500).json({ error: error?.message || "Insights Generation Failed" });
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

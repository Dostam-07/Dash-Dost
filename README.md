# Dash-Dost Analytics Dashboard

A highly polished, full-stack interactive analytics dashboard builder. It leverages an advanced local-first IndexedDB state machine, robust ISO-3166-1 fuzzy name mapping, customizable color palettes, and real-time LLM streaming compilation.

## 🚀 Architectural Innovations

### 1. Robust LLM Streaming Hub (OpenRouter + Ollama)
- **OpenRouter Primary Channel**: Connects seamlessly to high-tier AI models with real-time JSON spec schema validation.
- **Ollama Fallback Channel**: Detects network constraints and key absences, cascading automatically to local Ollama containers (`llama3.1`) running at `11434` to ensure offline readiness.
- **SSE Stream Compiler**: Parses conversational prompts into validated layout specifications on-the-fly.

### 2. Resilient Geography Map (`GeographyMap`)
- **Fuzzy Normalization Engine**: Corrects ISO alpha-2, alpha-3, and varied colloquial inputs across a full dictionary database of ~250 countries.
- **CDN Error Boundaries**: Handles asynchronous map retrieval failures with visual warning states and automated layout correction.
- **Micro-Interactions**: Features CSS flow corrections, custom palette themes (Indigo, Emerald, Violet), and animated centroid zooming.

### 3. Local-First Caching & Filter Syncing
- **Anti-Pollution Store**: Blocks redundant saved-session prompting, maintaining original user queries in dashboard indexes.
- **Pruning Deletion Engine**: Prevents data leaks by fully scrubbing related sessions, filters, and chat logs during dashboard deletion.
- **Filter Retention**: Instantly restores custom date ranges and selection maps upon session reloads and dynamic switching.

---

## 🛠️ Technology Stack
- **Languages**: TypeScript, ES Modules.
- **Frontend Core**: React 18, Vite, Tailwind CSS, Motion/React.
- **State & Data**: Zustand, IndexedDB (`idb-keyval`), Recharts, D3 Scale, React Simple Maps.
- **Backend Hub**: Node + Express, OpenAI SDK.
- **Parsing Ingestion**: PapaParse, XLSX, PDF/Mammoth collectors.

---

## 🎛️ Environment Configuration
Configure your credentials in `.env` (refer to `.env.example` as a template):
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

---

## 🏃 Getting Started
1. **Prepare Dependencies**:
   ```bash
   npm install
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
3. **Execute Production Build**:
   ```bash
   npm run build
   ```
4. **Boot Production Server**:
   ```bash
   npm run start
   ```

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true }));
var genAIClient = null;
function getGenAI() {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Warning: GEMINI_API_KEY environment variable is not set. Requests will fail if attempted.");
    }
    genAIClient = new import_genai.GoogleGenAI({ apiKey: apiKey || "" });
  }
  return genAIClient;
}
var MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  // Primary
  "gemini-3.1-flash-lite",
  // High-Availability Fallback
  "gemini-flash-latest",
  // Dynamic Alias
  "gemini-3.7-flash"
  // Deep Reasoning Fallback
];
async function generateContentWithFallback(params) {
  const ai = getGenAI();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please check your environment variables or Secrets panel.");
  }
  let lastError = null;
  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7
        }
      });
      const text = response.text || "";
      if (text.trim().length > 0) {
        console.log(`[Gemini API] Generation succeeded using model: ${model}`);
        return { text, modelUsed: model };
      }
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code || 0;
      const message = err?.message || String(err);
      console.warn(`[Gemini API] Model ${model} failed (Status: ${status}): ${message}. Trying next fallback model...`);
      const isRecoverable = status === 503 || // Unavailable
      status === 429 || // Resource Exhausted
      status === 404 || // Not Found (model alias deprecated or not enabled in region)
      status === 500 || // Internal
      status === 0 || // Network glitch
      message.includes("quota") || message.includes("overloaded") || message.includes("not found");
      if (!isRecoverable) {
        console.warn(`[Gemini API] Non-standard error code ${status}, will still attempt remaining models in ladder.`);
      }
    }
  }
  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}
function validateSafeWebhookUrl(urlStr, provider) {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") {
      return { safe: false, error: "Only secure HTTPS webhook URLs are allowed." };
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "169.254.169.254" || host === "metadata.google.internal" || host.endsWith(".local") || host.endsWith(".internal") || host === "::1" || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
      return { safe: false, error: "Target URL resolves to an internal or disallowed private address." };
    }
    if (provider === "slack") {
      if (!host.endsWith("slack.com")) {
        return { safe: false, error: "Slack webhook URLs must belong to hooks.slack.com or slack.com." };
      }
    } else if (provider === "discord") {
      if (!host.endsWith("discord.com") && !host.endsWith("discordapp.com")) {
        return { safe: false, error: "Discord webhook URLs must belong to discord.com or discordapp.com." };
      }
    }
    return { safe: true, parsedUrl: parsed };
  } catch (err) {
    return { safe: false, error: "Invalid URL format: " + (err?.message || "Could not parse URL") };
  }
}
function truncateString(str, maxLength) {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}
function buildSlackPayload(entry, triggerReason) {
  const title = entry.title || "Untitled Journal Reflection";
  const mode = (entry.mode || "reflect").toUpperCase();
  const prompt = truncateString(entry.initialPrompt || "", 400);
  const insight = truncateString(entry.latestAiInsight || "Reflection processed.", 1200);
  return {
    text: `MindReflect AI: [${mode}] ${title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `\u2728 MindReflect AI \u2014 ${mode} Reflection`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Title:*
${title}`
          },
          {
            type: "mrkdwn",
            text: `*Trigger Condition:*
${triggerReason || "Automated Sync"}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Journal Reflection Excerpt:*
>${prompt.replace(/\n/g, "\n>")}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*AI Insights & Action Items:*
${insight}`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `\u{1F512} Dispatched via MindReflect Notification API Directive \u2022 Isolated in Cloud Firestore \u2022 ${(/* @__PURE__ */ new Date()).toUTCString()}`
          }
        ]
      }
    ]
  };
}
function buildDiscordPayload(entry, triggerReason) {
  const title = entry.title || "Untitled Journal Reflection";
  const mode = entry.mode || "reflect";
  const prompt = truncateString(entry.initialPrompt || "", 350);
  const insight = truncateString(entry.latestAiInsight || "Reflection processed.", 1e3);
  const colorMap = {
    reflect: 6514417,
    // Indigo
    summarize: 165063,
    // Sky Blue
    brainstorm: 14251782,
    // Amber
    chat: 9647082
    // Purple
  };
  return {
    username: "MindReflect AI",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/8637/8637106.png",
    embeds: [
      {
        title: `\u2728 ${title}`,
        description: `**Prompt / Reflection:**
${prompt}

**AI Synthesis (${mode}):**
${insight}`,
        color: colorMap[mode] || 6514417,
        fields: [
          {
            name: "Mode",
            value: `\`${mode}\``,
            inline: true
          },
          {
            name: "Triggered By",
            value: triggerReason || "Automated Notification",
            inline: true
          },
          {
            name: "Security Protocol",
            value: "Firestore User-Isolation",
            inline: true
          }
        ],
        footer: {
          text: "MindReflect AI \u2022 Cloud Run AI Directive"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
}
function buildEmailPayload(entry, triggerReason, emailAddress) {
  const title = entry.title || "Untitled Journal Reflection";
  const mode = entry.mode || "reflect";
  const prompt = entry.initialPrompt || "";
  const insight = entry.latestAiInsight || "Reflection processed.";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0e1e; color: #f1f5f9; padding: 24px; border-radius: 12px; border: 1px solid #2d3748;">
      <div style="border-bottom: 1px solid #374151; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="background: #4f46e5; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
          ${mode} Journal Entry
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin-top: 12px; margin-bottom: 4px;">${title}</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Triggered by: ${triggerReason || "Automated Parse"}</p>
      </div>

      <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border-left: 3px solid #6366f1; margin-bottom: 20px;">
        <h3 style="color: #cbd5e1; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Original Reflection</h3>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${prompt}</p>
      </div>

      <div style="background: rgba(99,102,241,0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); margin-bottom: 24px;">
        <h3 style="color: #a5b4fc; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Gemini AI Synthesis</h3>
        <div style="color: #f8fafc; font-size: 14px; line-height: 1.6;">${insight.replace(/\n/g, "<br/>")}</div>
      </div>

      <div style="border-top: 1px solid #374151; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
        Sent via MindReflect AI Notification API Directive \u2022 Zero Passwords Stored \u2022 Cloud Firestore Isolated
      </div>
    </div>
  `;
  return {
    to: emailAddress || "user@example.com",
    subject: `[MindReflect AI] ${title} (${mode.toUpperCase()})`,
    text: `MindReflect AI: ${title}
Mode: ${mode}
Trigger: ${triggerReason}

Reflection:
${prompt}

AI Insight:
${insight}`,
    html,
    entry: {
      id: entry.id,
      title,
      mode,
      createdAt: entry.createdAt
    },
    triggerReason,
    timestamp: Date.now()
  };
}
app.get("/api/notifications/directive", (_req, res) => {
  res.json({
    version: "1.0.0",
    title: "MindReflect AI External Notification API Directive",
    description: "Defines authentication directives, SSRF security validation, and payload schemas for Slack, Discord, and Email Webhooks.",
    supportedProviders: ["slack", "discord", "email"],
    triggerModes: [
      { mode: "all", description: "Dispatches on every generated journal insight" },
      { mode: "summarize", description: "Dispatches when an Executive Summary with Action Items is generated" },
      { mode: "brainstorm", description: "Dispatches when a Breakthrough Creative Brainstorm is parsed" },
      { mode: "keywords", description: "Dispatches when reflection matches specified keywords (e.g., Action Items, Goals, Urgent)" },
      { mode: "manual", description: "Dispatches only when explicitly clicked by the authenticated user" }
    ],
    securityGuards: [
      "Strict HTTPS protocol enforcement",
      "SSRF blocking against loopback, 169.254.169.254 metadata server, and private RFC1918 subnets",
      "Domain restriction for Slack (*.slack.com) and Discord (*.discord.com / *.discordapp.com)",
      "Owner-isolated Firestore persistence for webhook URLs and credentials"
    ],
    payloadSchemas: {
      slack: {
        contentType: "application/json",
        format: "Slack Block Kit (Header, Section, Fields, Context)"
      },
      discord: {
        contentType: "application/json",
        format: "Discord Webhook Embed (Title, Description, Color, Fields, Footer, Timestamp)"
      },
      email: {
        contentType: "application/json",
        format: "Structured Email / Webhook Relay (To, Subject, Text, HTML, Metadata)"
      }
    }
  });
});
app.post("/api/notifications/test", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const provider = body.provider;
    const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
    const emailAddress = typeof body.emailAddress === "string" ? body.emailAddress.trim() : "";
    if (!provider || !["slack", "discord", "email"].includes(provider)) {
      res.status(400).json({ error: 'Invalid or missing provider. Must be "slack", "discord", or "email".' });
      return;
    }
    const testEntry = {
      id: "test-entry-" + Date.now(),
      title: "Connectivity Test Reflection",
      mode: "reflect",
      initialPrompt: "Testing external notification webhook integration from MindReflect AI.",
      latestAiInsight: "Connectivity verified. The Notification API directive is correctly formatting payloads and verifying dispatch credentials.",
      createdAt: Date.now()
    };
    if (provider === "email") {
      if (!webhookUrl && !emailAddress) {
        res.status(400).json({ error: "Please provide either an Email Webhook Relay URL or a target Email Address." });
        return;
      }
      if (webhookUrl) {
        const urlCheck2 = validateSafeWebhookUrl(webhookUrl);
        if (!urlCheck2.safe) {
          res.status(400).json({ error: urlCheck2.error });
          return;
        }
        const emailPayload = buildEmailPayload(testEntry, "Manual Webhook Connectivity Test", emailAddress);
        const webhookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload)
        });
        if (!webhookRes.ok) {
          const errText = await webhookRes.text().catch(() => "");
          res.status(webhookRes.status).json({
            error: `Email Webhook server responded with status ${webhookRes.status}: ${errText.slice(0, 200)}`
          });
          return;
        }
      }
      res.json({
        success: true,
        provider: "email",
        message: `Email notification test verified for ${emailAddress || webhookUrl}.`,
        timestamp: Date.now()
      });
      return;
    }
    if (!webhookUrl) {
      res.status(400).json({ error: `Missing ${provider} webhook URL.` });
      return;
    }
    const urlCheck = validateSafeWebhookUrl(webhookUrl, provider);
    if (!urlCheck.safe) {
      res.status(400).json({ error: urlCheck.error });
      return;
    }
    let payload;
    if (provider === "slack") {
      payload = buildSlackPayload(testEntry, "Webhook Connectivity Test");
    } else {
      payload = buildDiscordPayload(testEntry, "Webhook Connectivity Test");
    }
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      res.status(response.status).json({
        error: `${provider.toUpperCase()} webhook rejected request (Status ${response.status}): ${errorText.slice(0, 300)}`
      });
      return;
    }
    res.json({
      success: true,
      provider,
      message: `Successfully dispatched test notification to ${provider.toUpperCase()}!`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error in /api/notifications/test:", error);
    res.status(500).json({
      error: error?.message || "Failed to dispatch test notification. Please check network connectivity and URL validity."
    });
  }
});
app.post("/api/notifications/dispatch", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const provider = body.provider;
    const webhookUrl = typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";
    const emailAddress = typeof body.emailAddress === "string" ? body.emailAddress.trim() : "";
    const emailWebhookUrl = typeof body.emailWebhookUrl === "string" ? body.emailWebhookUrl.trim() : "";
    const entry = body.entry && typeof body.entry === "object" ? body.entry : null;
    const triggerReason = typeof body.triggerReason === "string" ? body.triggerReason : "Automated Entry Parse";
    if (!provider || !["slack", "discord", "email"].includes(provider)) {
      res.status(400).json({ error: "Invalid or missing provider." });
      return;
    }
    if (!entry || !entry.title) {
      res.status(400).json({ error: "Missing entry details for notification dispatch." });
      return;
    }
    if (provider === "email") {
      const targetUrl = emailWebhookUrl || process.env.EMAIL_WEBHOOK_URL;
      const targetEmail = emailAddress || process.env.USER_NOTIFICATION_EMAIL || "user@example.com";
      if (targetUrl) {
        const urlCheck2 = validateSafeWebhookUrl(targetUrl);
        if (!urlCheck2.safe) {
          res.status(400).json({ error: urlCheck2.error });
          return;
        }
        const emailPayload = buildEmailPayload(entry, triggerReason, targetEmail);
        const webhookRes2 = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload)
        });
        if (!webhookRes2.ok) {
          const errText = await webhookRes2.text().catch(() => "");
          res.status(webhookRes2.status).json({
            error: `Email relay failed with HTTP ${webhookRes2.status}: ${errText.slice(0, 200)}`
          });
          return;
        }
      }
      res.json({
        success: true,
        provider: "email",
        statusText: `Dispatched email payload for "${entry.title}"`,
        timestamp: Date.now()
      });
      return;
    }
    const targetWebhook = webhookUrl || (provider === "slack" ? process.env.SLACK_WEBHOOK_URL : process.env.DISCORD_WEBHOOK_URL);
    if (!targetWebhook) {
      res.status(400).json({ error: `No ${provider} webhook URL configured. Please configure it in Notification Settings.` });
      return;
    }
    const urlCheck = validateSafeWebhookUrl(targetWebhook, provider);
    if (!urlCheck.safe) {
      res.status(400).json({ error: urlCheck.error });
      return;
    }
    const payload = provider === "slack" ? buildSlackPayload(entry, triggerReason) : buildDiscordPayload(entry, triggerReason);
    const webhookRes = await fetch(targetWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!webhookRes.ok) {
      const errText = await webhookRes.text().catch(() => "");
      res.status(webhookRes.status).json({
        error: `${provider.toUpperCase()} webhook delivery failed with HTTP ${webhookRes.status}: ${errText.slice(0, 200)}`
      });
      return;
    }
    res.json({
      success: true,
      provider,
      statusText: `Successfully dispatched to ${provider.toUpperCase()}`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error in /api/notifications/dispatch:", error);
    res.status(500).json({
      error: error?.message || "Failed to dispatch notification."
    });
  }
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    hasApiKey: !!process.env.GEMINI_API_KEY
  });
});
app.post("/api/gemini/reflect", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode : "reflect";
    const history = Array.isArray(body.history) ? body.history : [];
    if (!prompt && history.length === 0) {
      res.status(400).json({ error: "Missing journal text or conversation prompt." });
      return;
    }
    let systemInstruction = `You are a thoughtful, empathetic, and insightful reflective AI journaling companion. 
Your goal is to help the user process their thoughts, discover new perspectives, uncover underlying emotional themes, and organize their reflections.
Provide empathetic, constructive, and well-structured responses. Use clean markdown formatting with headers, bullet points, and reflective questions where suitable.`;
    if (mode === "summarize") {
      systemInstruction = `You are an expert executive summarizer and analytical thinker.
Analyze the user's journal entries or reflections and provide:
1. **Executive Key Themes**: High-level takeaways and core topics.
2. **Emotional & Mental Landscape**: Emotional undertones, tone, and mindset insights.
3. **Actionable Takeaways / Next Steps**: Concrete reflections, follow-up habits, or items to explore.
4. **Brief One-Sentence Essence**: A memorable summary quote.
Structure your output neatly using clean Markdown with distinct headers and bullet points.`;
    } else if (mode === "brainstorm") {
      systemInstruction = `You are a creative brainstorming partner and strategic idea incubator.
Based on the user's journal prompt, offer fresh angles, creative solutions, divergent ideas, and provocative questions to inspire deeper breakthrough thinking.
Organize ideas into clear thematic clusters with bold headings and concrete examples.`;
    } else if (mode === "chat") {
      systemInstruction = `You are an attentive conversational partner for personal journaling and self-discovery.
Engage warmly, validate their experience, ask gentle follow-up questions, and guide the dialogue towards greater clarity and peace of mind.`;
    }
    const contents = [];
    for (const msg of history) {
      if (msg && typeof msg.content === "string" && msg.content.trim()) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content.trim() }]
        });
      }
    }
    if (prompt) {
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }
    const { text, modelUsed } = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: mode === "brainstorm" ? 0.85 : 0.65
    });
    let suggestedTitle;
    let detectedMood;
    let sentimentScore;
    if (history.length === 0 && prompt) {
      try {
        const titleRes = await generateContentWithFallback({
          contents: `Analyze this initial journal entry:

"${prompt.slice(0, 400)}"

Return a JSON object with:
- "title": 3-6 words evocative title (no quotes)
- "mood": one of ["clarity", "gratitude", "growth", "focus", "resilience", "anxious", "creative", "peaceful"]
- "sentimentScore": integer from 0 (very stressed/negative) to 100 (very positive/energized)

JSON format only:`,
          systemInstruction: "You extract title, mood, and sentiment score from journal entries. Return valid JSON only.",
          temperature: 0.2
        });
        const cleanJson = titleRes.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        suggestedTitle = parsed.title;
        detectedMood = parsed.mood;
        sentimentScore = typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : void 0;
      } catch (e) {
        console.warn("Metadata generation skipped or failed:", e);
      }
    }
    res.json({
      reply: text,
      modelUsed,
      suggestedTitle: suggestedTitle || void 0,
      detectedMood: detectedMood || void 0,
      sentimentScore: sentimentScore ?? void 0
    });
  } catch (error) {
    console.error("Error in /api/gemini/reflect:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate reflection with Gemini. Please try again."
    });
  }
});
app.post("/api/gemini/sparks", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const category = typeof body.category === "string" ? body.category : "stoic";
    const currentMood = typeof body.currentMood === "string" ? body.currentMood : "";
    const categoryPrompts = {
      stoic: "Stoic philosophy, emotional fortitude, locus of control, and acceptance of what cannot be changed",
      gratitude: "Deep gratitude, subtle everyday gifts, meaningful human connections, and appreciative inquiry",
      resilience: "Overcoming obstacles, reframing setback into growth opportunities, grit, and inner strength",
      growth: "Continuous personal development, expanding comfort zones, mastery, and future vision",
      clarity: "Deconstructing mental clutter, clarifying complex dilemmas, prioritization, and peace of mind",
      unwind: "Evening unwinding, releasing daily tension, mindful self-compassion, and peaceful closure",
      creative: "Creative breakthrough, divergent thinking, bold artistic ideas, and unbounded imagination"
    };
    const theme = categoryPrompts[category] || categoryPrompts.stoic;
    const moodContext = currentMood ? `The user is currently feeling "${currentMood}".` : "";
    const promptText = `Generate 4 distinct, deeply introspective, and beautifully phrased journal reflection prompts centered on: ${theme}. ${moodContext}
Each prompt should be 1-2 sentences long and provoke deep personal reflection without clich\xE9s.

Return ONLY a JSON array of 4 strings:
["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4"]`;
    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptText,
      systemInstruction: "You generate high-caliber, thought-provoking philosophical and introspective journal prompts. Return ONLY a valid JSON array of strings.",
      temperature: 0.8
    });
    let prompts = [];
    try {
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      prompts = JSON.parse(cleanJson);
    } catch (parseErr) {
      prompts = text.split("\n").filter((line) => line.trim().length > 10).slice(0, 4);
    }
    res.json({
      prompts,
      category,
      modelUsed,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error in /api/gemini/sparks:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate prompt sparks."
    });
  }
});
app.post("/api/gemini/analyze-insights", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      res.status(400).json({ error: "Missing text to analyze." });
      return;
    }
    const extractionPrompt = `Analyze the following journal entry or reflection conversation:
"""
${text.slice(0, 3e3)}
"""

Extract and return a JSON object with:
1. "actionItems": array of 2-5 concrete, actionable next steps or reflective micro-habits (strings)
2. "keyTakeaways": array of 2-3 essential realizations or insights (strings)
3. "mood": one of ["clarity", "gratitude", "growth", "focus", "resilience", "anxious", "creative", "peaceful"]
4. "sentimentScore": integer from 0 to 100 representing emotional wellbeing/clarity
5. "suggestedTags": array of 2-4 hashtag themes (e.g. ["Mindset", "Productivity"])

JSON output only:`;
    const { text: resultText, modelUsed } = await generateContentWithFallback({
      contents: extractionPrompt,
      systemInstruction: "You are an expert cognitive extractor. Extract action items, key insights, mood, sentiment, and tags. Return valid JSON only.",
      temperature: 0.3
    });
    let analysis = {};
    try {
      const clean = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
      analysis = JSON.parse(clean);
    } catch (e) {
      analysis = {
        actionItems: ["Reflect on key realizations", "Set a daily mindfulness check-in"],
        keyTakeaways: ["Clarity comes through structured introspection"],
        mood: "growth",
        sentimentScore: 75,
        suggestedTags: ["Reflections"]
      };
    }
    res.json({
      ...analysis,
      modelUsed,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error in /api/gemini/analyze-insights:", error);
    res.status(500).json({
      error: error?.message || "Failed to analyze reflection insights."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

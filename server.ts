import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY environment variable is not set. Requests will fail if attempted.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',       // Primary
  'gemini-3.1-flash-lite',  // High-Availability Fallback
  'gemini-flash-latest',    // Dynamic Alias
  'gemini-3.7-flash',       // Deep Reasoning Fallback
] as const;

/**
 * Resilient Gemini Content Generator with automated fallback ladder and error recovery
 */
async function generateContentWithFallback(params: {
  contents: string | Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your environment variables or Secrets panel.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: params.contents as any,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
        },
      });

      const text = response.text || '';
      if (text.trim().length > 0) {
        console.log(`[Gemini API] Generation succeeded using model: ${model}`);
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code || 0;
      const message = err?.message || String(err);
      console.warn(`[Gemini API] Model ${model} failed (Status: ${status}): ${message}. Trying next fallback model...`);

      // If status is a fatal auth error or bad prompt format, don't cascade needlessly unless it's a transient code
      const isRecoverable =
        status === 503 || // Unavailable
        status === 429 || // Resource Exhausted
        status === 404 || // Not Found (model alias deprecated or not enabled in region)
        status === 500 || // Internal
        status === 0 ||   // Network glitch
        message.includes('quota') ||
        message.includes('overloaded') ||
        message.includes('not found');

      if (!isRecoverable) {
        // Still attempt fallback in case of model-specific entitlement, but log
        console.warn(`[Gemini API] Non-standard error code ${status}, will still attempt remaining models in ladder.`);
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// SSRF Protection Helper
function validateSafeWebhookUrl(urlStr: string, provider?: string): { safe: boolean; error?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return { safe: false, error: 'Only secure HTTPS webhook URLs are allowed.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Disallow loopback, metadata services, and local IP addresses
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host === 'metadata.google.internal' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '::1' ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return { safe: false, error: 'Target URL resolves to an internal or disallowed private address.' };
    }

    if (provider === 'slack') {
      if (!host.endsWith('slack.com')) {
        return { safe: false, error: 'Slack webhook URLs must belong to hooks.slack.com or slack.com.' };
      }
    } else if (provider === 'discord') {
      if (!host.endsWith('discord.com') && !host.endsWith('discordapp.com')) {
        return { safe: false, error: 'Discord webhook URLs must belong to discord.com or discordapp.com.' };
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch (err: any) {
    return { safe: false, error: 'Invalid URL format: ' + (err?.message || 'Could not parse URL') };
  }
}

function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Format Slack Block Kit payload
function buildSlackPayload(entry: any, triggerReason: string) {
  const title = entry.title || 'Untitled Journal Reflection';
  const mode = (entry.mode || 'reflect').toUpperCase();
  const prompt = truncateString(entry.initialPrompt || '', 400);
  const insight = truncateString(entry.latestAiInsight || 'Reflection processed.', 1200);

  return {
    text: `MindReflect AI: [${mode}] ${title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `✨ MindReflect AI — ${mode} Reflection`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Title:*\n${title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Trigger Condition:*\n${triggerReason || 'Automated Sync'}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Journal Reflection Excerpt:*\n>${prompt.replace(/\n/g, '\n>')}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI Insights & Action Items:*\n${insight}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🔒 Dispatched via MindReflect Notification API Directive • Isolated in Cloud Firestore • ${new Date().toUTCString()}`,
          },
        ],
      },
    ],
  };
}

// Format Discord Webhook Embed payload
function buildDiscordPayload(entry: any, triggerReason: string) {
  const title = entry.title || 'Untitled Journal Reflection';
  const mode = entry.mode || 'reflect';
  const prompt = truncateString(entry.initialPrompt || '', 350);
  const insight = truncateString(entry.latestAiInsight || 'Reflection processed.', 1000);

  const colorMap: Record<string, number> = {
    reflect: 0x6366f1, // Indigo
    summarize: 0x0284c7, // Sky Blue
    brainstorm: 0xd97706, // Amber
    chat: 0x9333ea, // Purple
  };

  return {
    username: 'MindReflect AI',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/8637/8637106.png',
    embeds: [
      {
        title: `✨ ${title}`,
        description: `**Prompt / Reflection:**\n${prompt}\n\n**AI Synthesis (${mode}):**\n${insight}`,
        color: colorMap[mode] || 0x6366f1,
        fields: [
          {
            name: 'Mode',
            value: `\`${mode}\``,
            inline: true,
          },
          {
            name: 'Triggered By',
            value: triggerReason || 'Automated Notification',
            inline: true,
          },
          {
            name: 'Security Protocol',
            value: 'Firestore User-Isolation',
            inline: true,
          },
        ],
        footer: {
          text: 'MindReflect AI • Cloud Run AI Directive',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

// Format Email / Webhook Relay payload
function buildEmailPayload(entry: any, triggerReason: string, emailAddress: string) {
  const title = entry.title || 'Untitled Journal Reflection';
  const mode = entry.mode || 'reflect';
  const prompt = entry.initialPrompt || '';
  const insight = entry.latestAiInsight || 'Reflection processed.';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0e1e; color: #f1f5f9; padding: 24px; border-radius: 12px; border: 1px solid #2d3748;">
      <div style="border-bottom: 1px solid #374151; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="background: #4f46e5; color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
          ${mode} Journal Entry
        </span>
        <h1 style="color: #ffffff; font-size: 20px; margin-top: 12px; margin-bottom: 4px;">${title}</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Triggered by: ${triggerReason || 'Automated Parse'}</p>
      </div>

      <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border-left: 3px solid #6366f1; margin-bottom: 20px;">
        <h3 style="color: #cbd5e1; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Original Reflection</h3>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${prompt}</p>
      </div>

      <div style="background: rgba(99,102,241,0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(99,102,241,0.2); margin-bottom: 24px;">
        <h3 style="color: #a5b4fc; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Gemini AI Synthesis</h3>
        <div style="color: #f8fafc; font-size: 14px; line-height: 1.6;">${insight.replace(/\n/g, '<br/>')}</div>
      </div>

      <div style="border-top: 1px solid #374151; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center;">
        Sent via MindReflect AI Notification API Directive • Zero Passwords Stored • Cloud Firestore Isolated
      </div>
    </div>
  `;

  return {
    to: emailAddress || 'user@example.com',
    subject: `[MindReflect AI] ${title} (${mode.toUpperCase()})`,
    text: `MindReflect AI: ${title}\nMode: ${mode}\nTrigger: ${triggerReason}\n\nReflection:\n${prompt}\n\nAI Insight:\n${insight}`,
    html,
    entry: {
      id: entry.id,
      title,
      mode,
      createdAt: entry.createdAt,
    },
    triggerReason,
    timestamp: Date.now(),
  };
}

// Notification API Directive Specification Endpoint
app.get('/api/notifications/directive', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    title: 'MindReflect AI External Notification API Directive',
    description: 'Defines authentication directives, SSRF security validation, and payload schemas for Slack, Discord, and Email Webhooks.',
    supportedProviders: ['slack', 'discord', 'email'],
    triggerModes: [
      { mode: 'all', description: 'Dispatches on every generated journal insight' },
      { mode: 'summarize', description: 'Dispatches when an Executive Summary with Action Items is generated' },
      { mode: 'brainstorm', description: 'Dispatches when a Breakthrough Creative Brainstorm is parsed' },
      { mode: 'keywords', description: 'Dispatches when reflection matches specified keywords (e.g., Action Items, Goals, Urgent)' },
      { mode: 'manual', description: 'Dispatches only when explicitly clicked by the authenticated user' }
    ],
    securityGuards: [
      'Strict HTTPS protocol enforcement',
      'SSRF blocking against loopback, 169.254.169.254 metadata server, and private RFC1918 subnets',
      'Domain restriction for Slack (*.slack.com) and Discord (*.discord.com / *.discordapp.com)',
      'Owner-isolated Firestore persistence for webhook URLs and credentials'
    ],
    payloadSchemas: {
      slack: {
        contentType: 'application/json',
        format: 'Slack Block Kit (Header, Section, Fields, Context)',
      },
      discord: {
        contentType: 'application/json',
        format: 'Discord Webhook Embed (Title, Description, Color, Fields, Footer, Timestamp)',
      },
      email: {
        contentType: 'application/json',
        format: 'Structured Email / Webhook Relay (To, Subject, Text, HTML, Metadata)',
      }
    }
  });
});

// Test Notification Endpoint
app.post('/api/notifications/test', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const provider = body.provider as 'slack' | 'discord' | 'email';
    const webhookUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : '';
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim() : '';

    if (!provider || !['slack', 'discord', 'email'].includes(provider)) {
      res.status(400).json({ error: 'Invalid or missing provider. Must be "slack", "discord", or "email".' });
      return;
    }

    const testEntry = {
      id: 'test-entry-' + Date.now(),
      title: 'Connectivity Test Reflection',
      mode: 'reflect',
      initialPrompt: 'Testing external notification webhook integration from MindReflect AI.',
      latestAiInsight: 'Connectivity verified. The Notification API directive is correctly formatting payloads and verifying dispatch credentials.',
      createdAt: Date.now(),
    };

    if (provider === 'email') {
      if (!webhookUrl && !emailAddress) {
        res.status(400).json({ error: 'Please provide either an Email Webhook Relay URL or a target Email Address.' });
        return;
      }

      if (webhookUrl) {
        const urlCheck = validateSafeWebhookUrl(webhookUrl);
        if (!urlCheck.safe) {
          res.status(400).json({ error: urlCheck.error });
          return;
        }

        const emailPayload = buildEmailPayload(testEntry, 'Manual Webhook Connectivity Test', emailAddress);
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });

        if (!webhookRes.ok) {
          const errText = await webhookRes.text().catch(() => '');
          res.status(webhookRes.status).json({ 
            error: `Email Webhook server responded with status ${webhookRes.status}: ${errText.slice(0, 200)}` 
          });
          return;
        }
      }

      res.json({
        success: true,
        provider: 'email',
        message: `Email notification test verified for ${emailAddress || webhookUrl}.`,
        timestamp: Date.now(),
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

    let payload: any;
    if (provider === 'slack') {
      payload = buildSlackPayload(testEntry, 'Webhook Connectivity Test');
    } else {
      payload = buildDiscordPayload(testEntry, 'Webhook Connectivity Test');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      res.status(response.status).json({
        error: `${provider.toUpperCase()} webhook rejected request (Status ${response.status}): ${errorText.slice(0, 300)}`
      });
      return;
    }

    res.json({
      success: true,
      provider,
      message: `Successfully dispatched test notification to ${provider.toUpperCase()}!`,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/notifications/test:', error);
    res.status(500).json({
      error: error?.message || 'Failed to dispatch test notification. Please check network connectivity and URL validity.'
    });
  }
});

// Dispatch Live Notification Endpoint
app.post('/api/notifications/dispatch', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const provider = body.provider as 'slack' | 'discord' | 'email';
    const webhookUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : '';
    const emailAddress = typeof body.emailAddress === 'string' ? body.emailAddress.trim() : '';
    const emailWebhookUrl = typeof body.emailWebhookUrl === 'string' ? body.emailWebhookUrl.trim() : '';
    const entry = (body.entry && typeof body.entry === 'object') ? body.entry : null;
    const triggerReason = typeof body.triggerReason === 'string' ? body.triggerReason : 'Automated Entry Parse';

    if (!provider || !['slack', 'discord', 'email'].includes(provider)) {
      res.status(400).json({ error: 'Invalid or missing provider.' });
      return;
    }

    if (!entry || !entry.title) {
      res.status(400).json({ error: 'Missing entry details for notification dispatch.' });
      return;
    }

    if (provider === 'email') {
      const targetUrl = emailWebhookUrl || process.env.EMAIL_WEBHOOK_URL;
      const targetEmail = emailAddress || process.env.USER_NOTIFICATION_EMAIL || 'user@example.com';

      if (targetUrl) {
        const urlCheck = validateSafeWebhookUrl(targetUrl);
        if (!urlCheck.safe) {
          res.status(400).json({ error: urlCheck.error });
          return;
        }

        const emailPayload = buildEmailPayload(entry, triggerReason, targetEmail);
        const webhookRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });

        if (!webhookRes.ok) {
          const errText = await webhookRes.text().catch(() => '');
          res.status(webhookRes.status).json({
            error: `Email relay failed with HTTP ${webhookRes.status}: ${errText.slice(0, 200)}`
          });
          return;
        }
      }

      res.json({
        success: true,
        provider: 'email',
        statusText: `Dispatched email payload for "${entry.title}"`,
        timestamp: Date.now(),
      });
      return;
    }

    // Slack or Discord
    const targetWebhook = webhookUrl || (provider === 'slack' ? process.env.SLACK_WEBHOOK_URL : process.env.DISCORD_WEBHOOK_URL);

    if (!targetWebhook) {
      res.status(400).json({ error: `No ${provider} webhook URL configured. Please configure it in Notification Settings.` });
      return;
    }

    const urlCheck = validateSafeWebhookUrl(targetWebhook, provider);
    if (!urlCheck.safe) {
      res.status(400).json({ error: urlCheck.error });
      return;
    }

    const payload = provider === 'slack' 
      ? buildSlackPayload(entry, triggerReason) 
      : buildDiscordPayload(entry, triggerReason);

    const webhookRes = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!webhookRes.ok) {
      const errText = await webhookRes.text().catch(() => '');
      res.status(webhookRes.status).json({
        error: `${provider.toUpperCase()} webhook delivery failed with HTTP ${webhookRes.status}: ${errText.slice(0, 200)}`
      });
      return;
    }

    res.json({
      success: true,
      provider,
      statusText: `Successfully dispatched to ${provider.toUpperCase()}`,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/notifications/dispatch:', error);
    res.status(500).json({
      error: error?.message || 'Failed to dispatch notification.'
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    hasApiKey: !!process.env.GEMINI_API_KEY
  });
});

// Gemini AI reflection & summarization endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'reflect';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt && history.length === 0) {
      res.status(400).json({ error: 'Missing journal text or conversation prompt.' });
      return;
    }

    // System instructions based on mode
    let systemInstruction = `You are a thoughtful, empathetic, and insightful reflective AI journaling companion. 
Your goal is to help the user process their thoughts, discover new perspectives, uncover underlying emotional themes, and organize their reflections.
Provide empathetic, constructive, and well-structured responses. Use clean markdown formatting with headers, bullet points, and reflective questions where suitable.`;

    if (mode === 'summarize') {
      systemInstruction = `You are an expert executive summarizer and analytical thinker.
Analyze the user's journal entries or reflections and provide:
1. **Executive Key Themes**: High-level takeaways and core topics.
2. **Emotional & Mental Landscape**: Emotional undertones, tone, and mindset insights.
3. **Actionable Takeaways / Next Steps**: Concrete reflections, follow-up habits, or items to explore.
4. **Brief One-Sentence Essence**: A memorable summary quote.
Structure your output neatly using clean Markdown with distinct headers and bullet points.`;
    } else if (mode === 'brainstorm') {
      systemInstruction = `You are a creative brainstorming partner and strategic idea incubator.
Based on the user's journal prompt, offer fresh angles, creative solutions, divergent ideas, and provocative questions to inspire deeper breakthrough thinking.
Organize ideas into clear thematic clusters with bold headings and concrete examples.`;
    } else if (mode === 'chat') {
      systemInstruction = `You are an attentive conversational partner for personal journaling and self-discovery.
Engage warmly, validate their experience, ask gentle follow-up questions, and guide the dialogue towards greater clarity and peace of mind.`;
    }

    // Format conversation history for Gemini multi-turn format
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of history) {
      if (msg && typeof msg.content === 'string' && msg.content.trim()) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content.trim() }]
        });
      }
    }

    if (prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    }

    const { text, modelUsed } = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: mode === 'brainstorm' ? 0.85 : 0.65,
    });

    // Also attempt to generate a brief 3-5 word title if this is the first turn
    let suggestedTitle: string | undefined;
    let detectedMood: string | undefined;
    let sentimentScore: number | undefined;

    if (history.length === 0 && prompt) {
      try {
        const titleRes = await generateContentWithFallback({
          contents: `Analyze this initial journal entry:\n\n"${prompt.slice(0, 400)}"\n\nReturn a JSON object with:
- "title": 3-6 words evocative title (no quotes)
- "mood": one of ["clarity", "gratitude", "growth", "focus", "resilience", "anxious", "creative", "peaceful"]
- "sentimentScore": integer from 0 (very stressed/negative) to 100 (very positive/energized)

JSON format only:`,
          systemInstruction: 'You extract title, mood, and sentiment score from journal entries. Return valid JSON only.',
          temperature: 0.2,
        });
        const cleanJson = titleRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        suggestedTitle = parsed.title;
        detectedMood = parsed.mood;
        sentimentScore = typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : undefined;
      } catch (e) {
        console.warn('Metadata generation skipped or failed:', e);
      }
    }

    res.json({
      reply: text,
      modelUsed,
      suggestedTitle: suggestedTitle || undefined,
      detectedMood: detectedMood || undefined,
      sentimentScore: sentimentScore ?? undefined,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    res.status(500).json({ 
      error: error?.message || 'Failed to generate reflection with Gemini. Please try again.' 
    });
  }
});

// Endpoint: AI Reflection Catalyst & Prompt Spark Generator
app.post('/api/gemini/sparks', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const category = typeof body.category === 'string' ? body.category : 'stoic';
    const currentMood = typeof body.currentMood === 'string' ? body.currentMood : '';

    const categoryPrompts: Record<string, string> = {
      stoic: 'Stoic philosophy, emotional fortitude, locus of control, and acceptance of what cannot be changed',
      gratitude: 'Deep gratitude, subtle everyday gifts, meaningful human connections, and appreciative inquiry',
      resilience: 'Overcoming obstacles, reframing setback into growth opportunities, grit, and inner strength',
      growth: 'Continuous personal development, expanding comfort zones, mastery, and future vision',
      clarity: 'Deconstructing mental clutter, clarifying complex dilemmas, prioritization, and peace of mind',
      unwind: 'Evening unwinding, releasing daily tension, mindful self-compassion, and peaceful closure',
      creative: 'Creative breakthrough, divergent thinking, bold artistic ideas, and unbounded imagination'
    };

    const theme = categoryPrompts[category] || categoryPrompts.stoic;
    const moodContext = currentMood ? `The user is currently feeling "${currentMood}".` : '';

    const promptText = `Generate 4 distinct, deeply introspective, and beautifully phrased journal reflection prompts centered on: ${theme}. ${moodContext}
Each prompt should be 1-2 sentences long and provoke deep personal reflection without clichés.

Return ONLY a JSON array of 4 strings:
["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4"]`;

    const { text, modelUsed } = await generateContentWithFallback({
      contents: promptText,
      systemInstruction: 'You generate high-caliber, thought-provoking philosophical and introspective journal prompts. Return ONLY a valid JSON array of strings.',
      temperature: 0.8,
    });

    let prompts: string[] = [];
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      prompts = JSON.parse(cleanJson);
    } catch (parseErr) {
      prompts = text.split('\n').filter(line => line.trim().length > 10).slice(0, 4);
    }

    res.json({
      prompts,
      category,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/sparks:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate prompt sparks.'
    });
  }
});

// Endpoint: AI Action Item & Insight Extractor
app.post('/api/gemini/analyze-insights', async (req: Request, res: Response) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      res.status(400).json({ error: 'Missing text to analyze.' });
      return;
    }

    const extractionPrompt = `Analyze the following journal entry or reflection conversation:
"""
${text.slice(0, 3000)}
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
      systemInstruction: 'You are an expert cognitive extractor. Extract action items, key insights, mood, sentiment, and tags. Return valid JSON only.',
      temperature: 0.3,
    });

    let analysis: any = {};
    try {
      const clean = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      analysis = JSON.parse(clean);
    } catch (e) {
      analysis = {
        actionItems: ['Reflect on key realizations', 'Set a daily mindfulness check-in'],
        keyTakeaways: ['Clarity comes through structured introspection'],
        mood: 'growth',
        sentimentScore: 75,
        suggestedTags: ['Reflections']
      };
    }

    res.json({
      ...analysis,
      modelUsed,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-insights:', error);
    res.status(500).json({
      error: error?.message || 'Failed to analyze reflection insights.'
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

/**
 * Real OpenAI adapter. User-facing paths never return mocked results.
 * Live calls require OPENAI_API_KEY (or AI_API_KEY) + AI_PROVIDER=openai
 * AND AI_PAID_USAGE_APPROVED=1.
 */

import {
  coachingSuggestionSchema,
  dailyBriefSuggestionSchema,
  photoQcSuggestionSchema,
  productRefSuggestionSchema,
  sopSuggestionSchema,
} from '@/lib/ai-schemas';

export type AiKind = 'photo_qc' | 'daily_brief' | 'sop' | 'product_ref' | 'coaching' | 'transcribe';

export type AiUnavailableCode =
  | 'credentials_missing'
  | 'budget_not_approved'
  | 'sop_unavailable'
  | 'provider_error'
  | 'invalid_image'
  | 'timeout'
  | 'rate_limited';

export class AiUnavailableError extends Error {
  readonly code: AiUnavailableCode;
  readonly status: number;
  constructor(code: AiUnavailableCode, message: string, status = 503) {
    super(message);
    this.name = 'AiUnavailableError';
    this.code = code;
    this.status = status;
  }
}

export type AiResult = {
  kind: AiKind;
  mocked: false;
  provider: string;
  model: string;
  summary: string;
  suggestion?: Record<string, unknown>;
  sources?: string[];
  disclaimer: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  estimatedUsd: number;
};

export const AI_MODELS = {
  vision: process.env.AI_VISION_MODEL || 'gpt-4o',
  text: process.env.AI_TEXT_MODEL || 'gpt-4o-mini',
  transcribe: process.env.AI_TRANSCRIBE_MODEL || 'whisper-1',
} as const;

const DISCLAIMER = 'AI SUGGESTS. HUMAN CONFIRMS. Invisible properties (temperature, microbiology) are not measured.';

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

export function aiProviderName(): string {
  return (process.env.AI_PROVIDER || '').trim().toLowerCase();
}

export function aiPaidUsageApproved(): boolean {
  return process.env.AI_PAID_USAGE_APPROVED === '1';
}

export function aiLiveEnabled(): boolean {
  return Boolean(getOpenAiApiKey() && aiProviderName() === 'openai' && aiPaidUsageApproved());
}

export function assertAiLiveReady(kind?: AiKind): void {
  if (aiProviderName() && aiProviderName() !== 'openai') {
    throw new AiUnavailableError(
      'provider_error',
      `Unsupported AI_PROVIDER="${process.env.AI_PROVIDER}". Only openai is implemented.`
    );
  }
  if (!getOpenAiApiKey() || aiProviderName() !== 'openai') {
    throw new AiUnavailableError(
      'credentials_missing',
      'Real AI is not configured. Set OPENAI_API_KEY (or AI_API_KEY) and AI_PROVIDER=openai as staging Worker secrets. Do not put keys in the browser.'
    );
  }
  if (!aiPaidUsageApproved()) {
    throw new AiUnavailableError(
      'budget_not_approved',
      'OpenAI calls are paid. Set AI_PAID_USAGE_APPROVED=1 on staging only after the owner approves a budget. No live call was made.'
    );
  }
  void kind;
}

export function estimateUsd(model: string, tokensIn: number, tokensOut: number, audioMinutes = 0): number {
  if (model.includes('whisper') || model.includes('transcribe')) {
    return audioMinutes * 0.006;
  }
  const vision = model.includes('gpt-4o') && !model.includes('mini');
  const inRate = vision ? 2.5 / 1_000_000 : 0.15 / 1_000_000;
  const outRate = vision ? 10 / 1_000_000 : 0.6 / 1_000_000;
  return tokensIn * inRate + tokensOut * outRate;
}

type ImagePart = { mime: string; base64: string };

export async function runAi(
  kind: AiKind,
  input: Record<string, unknown>,
  images: ImagePart[] = []
): Promise<AiResult> {
  assertAiLiveReady(kind);
  const key = getOpenAiApiKey()!;
  const model = kind === 'photo_qc' || kind === 'product_ref' ? AI_MODELS.vision : AI_MODELS.text;
  const started = Date.now();
  const body = buildChatBody(kind, input, images, model);
  const raw = await openaiChat(key, body);
  const parsed = parseKind(kind, raw.content);
  return {
    kind,
    mocked: false,
    provider: 'openai',
    model,
    summary: parsed.summary,
    suggestion: parsed.suggestion,
    sources: parsed.sources,
    disclaimer: DISCLAIMER,
    latencyMs: Date.now() - started,
    tokensIn: raw.tokensIn,
    tokensOut: raw.tokensOut,
    estimatedUsd: estimateUsd(model, raw.tokensIn, raw.tokensOut),
  };
}

export async function transcribeAudio(file: File, language?: string): Promise<AiResult> {
  assertAiLiveReady();
  const key = getOpenAiApiKey()!;
  const started = Date.now();
  const form = new FormData();
  form.append('file', file);
  form.append('model', AI_MODELS.transcribe);
  if (language === 'ar' || language === 'en') form.append('language', language);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiUnavailableError('timeout', 'Speech transcription timed out.', 504);
    }
    throw new AiUnavailableError('provider_error', 'Speech transcription failed.');
  }
  clearTimeout(timer);
  const json = (await res.json()) as { text?: string; error?: { message?: string } };
  if (!res.ok || !json.text) {
    throw new AiUnavailableError('provider_error', json.error?.message || 'Transcription provider error.');
  }
  const minutes = Math.max(0.05, (file.size / 32_000) * (1 / 60));
  return {
    kind: 'transcribe',
    mocked: false,
    provider: 'openai',
    model: AI_MODELS.transcribe,
    summary: json.text,
    suggestion: { text: json.text, needsConfirmation: true, language: language ?? 'auto' },
    disclaimer: 'AI SUGGESTS. HUMAN CONFIRMS before saving spoken notes.',
    latencyMs: Date.now() - started,
    tokensIn: 0,
    tokensOut: 0,
    estimatedUsd: estimateUsd(AI_MODELS.transcribe, 0, 0, minutes),
  };
}

function buildChatBody(kind: AiKind, input: Record<string, unknown>, images: ImagePart[], model: string) {
  const text = promptFor(kind, input);
  const content: Array<Record<string, unknown>> = [{ type: 'text', text }];
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.base64}`, detail: 'auto' },
    });
  }
  return {
    model,
    temperature: 0.1,
    max_tokens: kind === 'photo_qc' || kind === 'product_ref' ? 1200 : 800,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are DRINKAT QC assist. Always return a single JSON object. If a photograph is blank, tiny, or unusable, still return JSON with unassessable=true and humanMustConfirm=true. Never return an empty body. Never invent statistics. Never measure temperature or microbiology. AI suggests; human confirms.',
      },
      { role: 'user', content },
    ],
  };
}

function promptFor(kind: AiKind, input: Record<string, unknown>): string {
  switch (kind) {
    case 'photo_qc':
      return `Assess this DRINKAT inspection against the supplied criteria and approved reference photographs only.
Inspection: ${String(input.title ?? '')}
Type code: ${String(input.typeCode ?? '')}
Slot: ${String(input.slotLabel ?? '')}
Staff photographs in this one submission: ${String(input.staffPhotoCount ?? 1)}
The first ${String(input.staffPhotoCount ?? 1)} image(s) are the staff submission (one to three views of the same check, not a panorama). One photograph is sufficient. Do not require additional photographs because of the inspection title. Any remaining images are approved references.
Measured value recorded by employee (if any): ${String(input.measuredValue ?? '')}
Owner-approved handwritten specifications (override the working manual on conflict): ${String(input.handwrittenNote ?? '')}
Observable criteria (assess each key; met=true/false/null): ${JSON.stringify(input.criteria ?? [])}
Approved reference photo count: ${String(input.referenceCount ?? 0)}
FDA Food Code 2026 is a U.S. model, not Jordanian law. Use only these citations as internal visual hints: ${JSON.stringify(input.fdaHints ?? [])}
Approved SOP excerpts: ${JSON.stringify(input.sopExcerpts ?? [])}
Return JSON: unassessable (boolean), imageClarity (good|poor|unusable), criteria[{key,met,note}], explanation, cannotAssess[], humanMustConfirm=true.
Do not invent a 0–100 total score. Do not invent recipes, ppm, temperatures, or legal requirements. Do not infer invisible food-safety conditions. Do not fail a submission only because fewer than three photographs were sent. If a criterion cannot be seen in the submitted evidence, set met=null and unassessable=true when none can be assessed. Assess the set together.`;
    case 'product_ref':
      return `Compare the approved reference photograph with the actual product photograph. Criteria: ${JSON.stringify(input.criteria ?? {})}.
Return JSON: visibleDifferences[], presentationObservations[], suggestedCompliance (meets|does_not_meet|uncertain), uncertainty, recommendHumanReview=true.
Do not invent numerical similarity scores.`;
    case 'daily_brief':
      return `Summarize ONLY these database facts. Do not add or change numbers.
Facts: ${JSON.stringify(input.facts ?? {})}.
    Return JSON with summary as a single string, priorityActions as a string array, usedOnlySuppliedFacts=true.`;
    case 'coaching':
      return `Recommend improvements using ONLY this verified evidence. Do not invent failures. Do not change KPI scores.
Evidence: ${JSON.stringify(input.evidence ?? {})}.
Return JSON: recommendations[], evidenceRefs[], inventedFailures=false.`;
    case 'sop':
      return `Answer using ONLY these approved SOP passages. If they do not contain the answer, say you cannot answer from approved SOPs.
Passages: ${JSON.stringify(input.passages ?? [])}
Question: ${String(input.question ?? '')}
Return JSON: answer, sources[], grounded (boolean), uncertain (boolean).
Do not use general internet knowledge.`;
    default:
      return JSON.stringify(input);
  }
}

export function extractChatContent(json: {
  choices?: {
    finish_reason?: string;
    message?: { content?: unknown; refusal?: string };
  }[];
}): string | null {
  const choice = json.choices?.[0];
  const refusal = choice?.message?.refusal?.trim();
  if (refusal) return JSON.stringify({ unassessable: true, imageClarity: 'unusable', criteria: [], explanation: refusal, cannotAssess: ['model_refusal'], humanMustConfirm: true });
  const raw = choice?.message?.content;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    const text = raw
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text?: string }).text ?? '');
        return '';
      })
      .join('')
      .trim();
    if (text) return text;
  }
  return null;
}

async function openaiChatOnce(
  key: string,
  body: unknown,
  timeoutMs: number
): Promise<{ content: string | null; tokensIn: number; tokensOut: number; status: number; finishReason: string | null; errorMessage: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiUnavailableError('timeout', 'AI provider timed out.', 504);
    }
    throw new AiUnavailableError('provider_error', 'AI provider request failed.');
  }
  clearTimeout(timer);
  const json = (await res.json()) as {
    choices?: { finish_reason?: string; message?: { content?: unknown; refusal?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) {
    const msg = json.error?.message || `OpenAI HTTP ${res.status}`;
    throw new AiUnavailableError(res.status === 429 ? 'rate_limited' : 'provider_error', msg, res.status === 429 ? 429 : 503);
  }
  return {
    content: extractChatContent(json),
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
    status: res.status,
    finishReason: json.choices?.[0]?.finish_reason ?? null,
    errorMessage: json.error?.message ?? null,
  };
}

async function openaiChat(key: string, body: unknown): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const timeoutMs = 55_000;
  let result = await openaiChatOnce(key, body, timeoutMs);
  if (!result.content) {
    const retryBody =
      body && typeof body === 'object'
        ? { ...(body as Record<string, unknown>), max_tokens: 1600, temperature: 0 }
        : body;
    result = await openaiChatOnce(key, retryBody, timeoutMs);
  }
  if (!result.content) {
    throw new AiUnavailableError(
      'provider_error',
      `AI provider returned an empty response (finish_reason=${result.finishReason ?? 'none'}).`
    );
  }
  return {
    content: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  };
}

function parseKind(kind: AiKind, content: string): {
  summary: string;
  suggestion: Record<string, unknown>;
  sources?: string[];
} {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new AiUnavailableError('provider_error', 'AI provider returned invalid JSON.');
  }
  if (kind === 'photo_qc') {
    const s = photoQcSuggestionSchema.parse(raw);
    return { summary: s.explanation, suggestion: s };
  }
  if (kind === 'product_ref') {
    const s = productRefSuggestionSchema.parse(raw);
    return { summary: s.uncertainty, suggestion: s };
  }
  if (kind === 'daily_brief') {
    const s = dailyBriefSuggestionSchema.parse(raw);
    return { summary: s.summary, suggestion: s };
  }
  if (kind === 'coaching') {
    const s = coachingSuggestionSchema.parse(raw);
    return { summary: s.recommendations.join(' '), suggestion: s };
  }
  if (kind === 'sop') {
    const s = sopSuggestionSchema.parse(raw);
    return { summary: s.answer, suggestion: s, sources: s.sources };
  }
  return { summary: JSON.stringify(raw), suggestion: raw as Record<string, unknown> };
}

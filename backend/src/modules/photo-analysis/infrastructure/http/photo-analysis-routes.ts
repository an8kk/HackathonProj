import type { FastifyInstance } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export type PhotoAnalysisResult = {
  is_food_waste: boolean;
  detected_product: string;
  condition: string;
  suggested_reason: 'expired' | 'damaged' | 'quality' | 'other';
  warning: string | null;
};

const SYSTEM_PROMPT = `Ты — ИИ-ассистент для проверки фотографий списаний в сети ресторанов быстрого питания Bahandi Burger.
Анализируй фото и отвечай ТОЛЬКО валидным JSON без markdown-обёртки, строго по схеме:
{
  "is_food_waste": boolean,
  "detected_product": string,
  "condition": string,
  "suggested_reason": "expired" | "damaged" | "quality" | "other",
  "warning": string | null
}

Правила:
- is_food_waste: true только если на фото явно виден испорченный/повреждённый продукт питания
- detected_product: название продукта на русском или "неизвестно"
- condition: одно предложение на русском, описывающее состояние
- suggested_reason: наиболее подходящая причина
- warning: null если всё в порядке; строка с причиной подозрения если фото подозрительное (скриншот, нет еды, пустой фон)`;

const requestSchema = z.object({
  image_base64: z.string().min(1),
  media_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
});

const MOCK_RESULT: PhotoAnalysisResult = {
  is_food_waste: true,
  detected_product: 'Говяжья котлета',
  condition: 'Продукт пережарен, края обуглены, не соответствует стандартам подачи',
  suggested_reason: 'quality',
  warning: null,
};

export const registerPhotoAnalysisRoutes = async (server: FastifyInstance): Promise<void> => {
  server.post('/photo-analysis/analyze', async (request, reply) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Mock mode: no API key configured — return realistic demo response
    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 1200)); // simulate latency
      return reply.send({ success: true, data: MOCK_RESULT });
    }

    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid request body' });
    }

    const { image_base64, media_type } = parsed.data;
    const client = new Anthropic({ apiKey });

    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: media_type, data: image_base64 },
              },
              { type: 'text', text: 'Проанализируй это фото для списания.' },
            ],
          },
        ],
      });

      const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const result: PhotoAnalysisResult = JSON.parse(raw);
      return reply.send({ success: true, data: result });
    } catch (err) {
      server.log.error(err, 'photo-analysis error');
      return reply.status(502).send({ success: false, error: 'Analysis failed' });
    }
  });
};


'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing audio to detect deepfakes.
 *
 * - analyzeAudioForDeepfake - A function that handles the deepfake detection process for audio files.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeAudioForDeepfakeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to analyze, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  learnedContext: z.string().optional().describe('Contextual knowledge learned from previously labeled datasets and user feedback.'),
});

const AnalyzeAudioForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the audio is detected as a deepfake, false otherwise.'),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  suspiciousSegments: z.array(
    z.object({
      startTime: z.number().describe('Start time in seconds.'),
      endTime: z.number().describe('End time in seconds.'),
      reason: z.string(),
    })
  ).optional(),
});

const audioDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: AnalyzeAudioForDeepfakeInputSchema },
  output: { schema: AnalyzeAudioForDeepfakeOutputSchema },
  prompt: `You are an elite vocal forensics expert. Your task is to detect AI-synthesized speech.

{{#if learnedContext}}
### LEARNED KNOWLEDGE BASE (MANDATORY)
Incorporate the following user-verified observations into your analysis. These observations represent ground truth:
{{{learnedContext}}}
{{/if}}

Search for:
1. **Neural Vocoder Artifacts**: Metallic textures or robotic resonances.
2. **Prosodic Unnaturalness**: Micro-fluctuations in pitch that don't align with human breath.
3. **Spectral Noise Floor**: Identify if the silence between words is "too clean" or contains latent generative noise.

Audio to analyze: {{media url=audioDataUri}}`,
});

export async function analyzeAudioForDeepfake(
  input: z.infer<typeof AnalyzeAudioForDeepfakeInputSchema>
): Promise<z.infer<typeof AnalyzeAudioForDeepfakeOutputSchema>> {
  const { output } = await audioDeepfakeDetectionPrompt(input);
  if (!output) {
    throw new Error('AI did not return an output for audio deepfake detection.');
  }
  return output;
}

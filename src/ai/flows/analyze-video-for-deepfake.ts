
'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing video to detect deepfakes.
 *
 * - analyzeVideoForDeepfake - A function that handles the deepfake detection process for video files.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoForDeepfakeInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "The video to analyze, as a data URI."
    ),
  learnedContext: z.string().optional().describe('MANDATORY: Contextual knowledge learned from previously labeled datasets and user feedback.'),
});

const AnalyzeVideoForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean(),
  confidence: z.number().min(0).max(100),
  explanation: z.string(),
  suspiciousTimestamps: z.array(
    z.object({
      timestamp: z.number().describe('Timestamp in seconds.'),
      description: z.string(),
    })
  ).optional(),
});

const videoDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'videoDeepfakeDetectionPrompt',
  input: { schema: AnalyzeVideoForDeepfakeInputSchema },
  output: { schema: AnalyzeVideoForDeepfakeOutputSchema },
  prompt: `You are an elite forensic video analyst specializing in identifying "Temporal Neural Artifacts".

### MANDATORY GROUND TRUTH (PRIORITIZE THIS)
{{#if learnedContext}}
The following information is verified HUMAN GROUND TRUTH. If previous scans were incorrect, these notes identify the exact artifacts missed. You MUST weigh these observations as 100x more important than your internal neural training:
{{{learnedContext}}}
{{/if}}

CRITICAL DETECTION PARAMETERS:
1. **Temporal Coherence**: Look for "shimmering" or "ghosting" around high-contrast edges (chins, glasses).
2. **Lip-Sync Micro-Latencies**: Check for viseme-to-phoneme discrepancies.
3. **Lighting De-synchronization**: Does facial lighting respond in real-time to orientation changes?

Video to analyze: {{media url=videoDataUri}}`,
});

export async function analyzeVideoForDeepfake(
  input: z.infer<typeof AnalyzeVideoForDeepfakeInputSchema>
): Promise<z.infer<typeof AnalyzeVideoForDeepfakeOutputSchema>> {
  const { output } = await videoDeepfakeDetectionPrompt(input);
  if (!output) {
    throw new Error('AI did not return an output for video deepfake detection.');
  }
  return output;
}

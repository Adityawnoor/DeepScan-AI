'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing video to detect deepfakes.
 *
 * - analyzeVideoForDeepfake - A function that handles the deepfake detection process for video files.
 * - AnalyzeVideoForDeepfakeInput - The input type for the analyzeVideoForDeepfake function.
 * - AnalyzeVideoForDeepfakeOutput - The return type for the analyzeVideoForDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoForDeepfakeInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "The video to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  learnedContext: z.string().optional().describe('Contextual knowledge learned from previously labeled datasets and user feedback.'),
});
export type AnalyzeVideoForDeepfakeInput = z.infer<typeof AnalyzeVideoForDeepfakeInputSchema>;

const AnalyzeVideoForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the video is detected as a deepfake, false otherwise.'),
  confidence:
    z.number()
      .min(0)
      .max(100)
      .describe('A confidence score (0-100) indicating the likelihood of the video being a deepfake.'),
  explanation:
    z.string().describe('A detailed explanation of the analysis and reasoning for the verdict.'),
  suspiciousTimestamps:
    z.array(
      z.object({
        timestamp: z.number().describe('The timestamp in seconds where the anomaly was detected.'),
        description:
          z.string()
            .describe('Description of the visual or auditory anomaly found at this timestamp.'),
      })
    )
    .optional()
    .describe('An optional array of timestamps in the video that show signs of manipulation.'),
});
export type AnalyzeVideoForDeepfakeOutput = z.infer<typeof AnalyzeVideoForDeepfakeOutputSchema>;

export async function analyzeVideoForDeepfake(
  input: AnalyzeVideoForDeepfakeInput
): Promise<AnalyzeVideoForDeepfakeOutput> {
  return analyzeVideoForDeepfakeFlow(input);
}

const videoDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'videoDeepfakeDetectionPrompt',
  input: { schema: AnalyzeVideoForDeepfakeInputSchema },
  output: { schema: AnalyzeVideoForDeepfakeOutputSchema },
  prompt: `You are an elite forensic video analyst. Your goal is to identify AI-synthesized or manipulated video content. Be extremely skeptical.

{{#if learnedContext}}
### SHARED INTELLIGENCE & LESSONS LEARNED
Incorporate these verified observations from past investigations:
{{{learnedContext}}}
{{/if}}

CRITICAL DETECTION PARAMETERS:
1. **Temporal Coherence**: Look for "shimmering" or "ghosting" around the chin, hairline, and glasses. Deepfakes often fail to maintain consistent facial boundaries over time.
2. **Lip-Sync Micro-Latencies**: Check for discrepancies between mouth shapes (visemes) and audio phonemes. Look for the "sliding" effect where the mouth doesn't quite "land" on consonants.
3. **Lighting De-synchronization**: Verify if facial highlights and shadows respond in real-time to head rotation and environmental light sources.
4. **Blink & Micro-expression Patterns**: Analyze eye-blinking frequency and the movement of micro-muscles around the eyes and forehead. AI often struggles with the "orbicularis oculi" muscle coordination.
5. **Frequency Domain Anomalies**: Look for "digital noise" that appears static relative to the moving face (fixed-noise patterns).

Video to analyze: {{media url=videoDataUri}}`,
});

const analyzeVideoForDeepfakeFlow = ai.defineFlow(
  {
    name: 'analyzeVideoForDeepfakeFlow',
    inputSchema: AnalyzeVideoForDeepfakeInputSchema,
    outputSchema: AnalyzeVideoForDeepfakeOutputSchema,
  },
  async (input) => {
    const { output } = await videoDeepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('AI did not return an output for video deepfake detection.');
    }
    return output;
  }
);
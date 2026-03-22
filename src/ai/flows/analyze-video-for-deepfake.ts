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
  prompt: `You are a forensic video expert. Analyze the provided video for sophisticated temporal manipulations.

{{#if learnedContext}}
### LEARNED KNOWLEDGE BASE
Apply the following rules and patterns learned from previously verified training data:
{{{learnedContext}}}
{{/if}}

Look for:
1. **Temporal Jitter**: "Shimmering" around facial boundaries.
2. **Sync Discrepancies**: Micro-latencies between mouth shapes and audio.
3. **Lighting De-synchronization**: Check if facial shadows respond correctly to head movements.
4. **Blink Patterns**: Look for static or muscularly impossible eye movements.

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
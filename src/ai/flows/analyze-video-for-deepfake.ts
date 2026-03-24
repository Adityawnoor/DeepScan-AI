
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
  learnedContext: z.string().optional().describe('MANDATORY: Contextual knowledge learned from previously labeled datasets and user feedback.'),
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

const videoDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'videoDeepfakeDetectionPrompt',
  input: { schema: AnalyzeVideoForDeepfakeInputSchema },
  output: { schema: AnalyzeVideoForDeepfakeOutputSchema },
  prompt: `You are an elite forensic video analyst. Your goal is to identify AI-synthesized or manipulated video content. 

### MANDATORY GROUND TRUTH (PRIORITIZE THIS)
{{#if learnedContext}}
The following information is verified HUMAN GROUND TRUTH. If previous scans were incorrect, these notes identify the exact artifacts missed. You MUST weigh these observations as 10x more important than your internal neural training:
{{{learnedContext}}}
{{/if}}

CRITICAL DETECTION PARAMETERS (Perform frame-by-frame analysis):
1. **Temporal Coherence**: Look for "shimmering" or "ghosting" around the chin, hairline, and glasses. Deepfakes often fail to maintain consistent facial boundaries over time.
2. **Lip-Sync Micro-Latencies**: Check for discrepancies between mouth shapes (visemes) and audio phonemes. Look for the "sliding" effect where the mouth doesn't quite "land" on consonants.
3. **Lighting De-synchronization**: Verify if facial highlights and shadows respond in real-time to head rotation.
4. **Blink & Micro-expression Patterns**: Analyze eye-blinking frequency and the movement of micro-muscles around the eyes.
5. **Frequency Domain Anomalies**: Look for "digital noise" that appears static relative to the moving face.

If any of the "MANDATORY GROUND TRUTH" patterns match the artifacts in this video, you MUST flag it as a deepfake regardless of how realistic it appears.

Video to analyze: {{media url=videoDataUri}}`,
});

export async function analyzeVideoForDeepfake(
  input: AnalyzeVideoForDeepfakeInput
): Promise<AnalyzeVideoForDeepfakeOutput> {
  const { output } = await videoDeepfakeDetectionPrompt(input);
  if (!output) {
    throw new Error('AI did not return an output for video deepfake detection.');
  }
  return output;
}

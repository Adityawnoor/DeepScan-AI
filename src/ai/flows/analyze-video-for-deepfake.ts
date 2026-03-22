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
  prompt: `You are a forensic video expert trained to expose state-of-the-art temporal manipulations. Analyze the provided video with extreme scrutiny.

Search for these temporal and spatial clues:
1.  **Temporal Flickering**: Look for single-frame inconsistencies around the eyes, teeth, and jawline where the mask might lose alignment.
2.  **Lip-Sync Latency**: Detect micro-delays between phonetic sounds and the corresponding lip movements.
3.  **Frame-to-Frame Continuity**: Check for subtle warping or "ghosting" effects when the subject moves their head rapidly.
4.  **Lighting and Shadows**: Do the face shadows move in perfect synchronization with the head's rotation relative to the environment?
5.  **Compression Artifacts**: Identify if the compression noise is inconsistent between the face and the rest of the scene.

Assume the manipulation is high-quality and look for the smallest breaks in reality.

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

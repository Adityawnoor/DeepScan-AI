'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing audio to detect deepfakes.
 *
 * - analyzeAudioForDeepfake - A function that handles the deepfake detection process for audio files.
 * - AnalyzeAudioForDeepfakeInput - The input type for the analyzeAudioForDeepfake function.
 * - AnalyzeAudioForDeepfakeOutput - The return type for the analyzeAudioForDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeAudioForDeepfakeInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeAudioForDeepfakeInput = z.infer<typeof AnalyzeAudioForDeepfakeInputSchema>;

const AnalyzeAudioForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the audio is detected as a deepfake, false otherwise.'),
  confidence:
    z.number()
      .min(0)
      .max(100)
      .describe('A confidence score (0-100) indicating the likelihood of the audio being a deepfake.'),
  explanation:
    z.string().describe('A detailed explanation of the analysis and reasoning for the verdict.'),
  suspiciousSegments:
    z.array(
      z.object({
        startTime: z.number().describe('The start time of the suspicious segment in seconds.'),
        endTime: z.number().describe('The end time of the suspicious segment in seconds.'),
        reason:
          z.string()
            .describe('The reason why this specific segment is considered suspicious.'),
      })
    )
    .optional()
    .describe('An optional array of time segments in the audio that show signs of manipulation.'),
});
export type AnalyzeAudioForDeepfakeOutput = z.infer<typeof AnalyzeAudioForDeepfakeOutputSchema>;

export async function analyzeAudioForDeepfake(
  input: AnalyzeAudioForDeepfakeInput
): Promise<AnalyzeAudioForDeepfakeOutput> {
  return analyzeAudioForDeepfakeFlow(input);
}

const audioDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: AnalyzeAudioForDeepfakeInputSchema },
  output: { schema: AnalyzeAudioForDeepfakeOutputSchema },
  prompt: `You are a highly specialized audio forensic engineer. Your mission is to detect AI-synthesized speech or voice cloning with maximum rigor.

Analyze the audio for even the most subtle vocal artifacts:
1.  **Phase Discontinuity**: Look for unnatural phase shifts or robotic metallic resonances that indicate neural vocoders.
2.  **Breathing and Plosives**: Are the breaths naturally timed and placed? Check for "dry" plosives (p, b, t) that lack a natural air-burst signature.
3.  **Spectral Gaps**: Identify any missing frequency bands or unusual spectral energy distributions typical of compressed generative models.
4.  **Prosody and Emotion**: Detect monotonic delivery or micro-fluctuations in pitch that don't match the linguistic content.
5.  **Background Coherence**: Does the noise floor remain perfectly consistent? Sudden changes in background atmosphere during silence are a red flag.

Be highly sensitive to subtle "glitching" or "warping" in the vocal texture.

Audio to analyze: {{media url=audioDataUri}}`,
});

const analyzeAudioForDeepfakeFlow = ai.defineFlow(
  {
    name: 'analyzeAudioForDeepfakeFlow',
    inputSchema: AnalyzeAudioForDeepfakeInputSchema,
    outputSchema: AnalyzeAudioForDeepfakeOutputSchema,
  },
  async (input) => {
    const { output } = await audioDeepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('AI did not return an output for audio deepfake detection.');
    }
    return output;
  }
);

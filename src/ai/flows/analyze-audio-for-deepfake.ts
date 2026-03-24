
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
  learnedContext: z.string().optional().describe('Contextual knowledge learned from previously labeled datasets and user feedback.'),
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

const audioDeepfakeDetectionPrompt = ai.definePrompt({
  name: 'audioDeepfakeDetectionPrompt',
  input: { schema: AnalyzeAudioForDeepfakeInputSchema },
  output: { schema: AnalyzeAudioForDeepfakeOutputSchema },
  prompt: `You are an expert in vocal forensics. Your task is to detect AI-synthesized speech.

{{#if learnedContext}}
### LEARNED KNOWLEDGE BASE
Incorporate the following user-verified observations and dataset labels into your analysis:
{{{learnedContext}}}
{{/if}}

Search for:
1. **Robotic Resonances**: Metallic textures from failing neural vocoders.
2. **Prosodic Unnaturalness**: Micro-fluctuations in pitch not aligning with human breath.
3. **Spectral Inconsistencies**: "Ghosting" frequencies or unnatural silence.
4. **Transition Artifacts**: Clicks or warps between words.

Audio to analyze: {{media url=audioDataUri}}`,
});

export async function analyzeAudioForDeepfake(
  input: AnalyzeAudioForDeepfakeInput
): Promise<AnalyzeAudioForDeepfakeOutput> {
  const { output } = await audioDeepfakeDetectionPrompt(input);
  if (!output) {
    throw new Error('AI did not return an output for audio deepfake detection.');
  }
  return output;
}

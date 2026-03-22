'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing an image to detect deepfakes.
 *
 * - analyzeImageForDeepfake - A function that handles the deepfake detection process for an image.
 * - AnalyzeImageForDeepfakeInput - The input type for the analyzeImageForDeepfake function.
 * - AnalyzeImageForDeepfakeOutput - The return type for the analyzeImageForDeepfake function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeImageForDeepfakeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image to analyze, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageForDeepfakeInput = z.infer<typeof AnalyzeImageForDeepfakeInputSchema>;

const AnalyzeImageForDeepfakeOutputSchema = z.object({
  isDeepfake: z.boolean().describe('True if the image is detected as a deepfake, false otherwise.'),
  confidence:
    z.number()
      .min(0)
      .max(100)
      .describe('A confidence score (0-100) indicating the likelihood of the image being a deepfake.'),
  explanation:
    z.string().describe('A detailed explanation of the analysis and reasoning for the verdict.'),
  highlightedRegions:
    z.array(
      z.object({
        x: z.number().describe('The X-coordinate of the top-left corner of the region.'),
        y: z.number().describe('The Y-coordinate of the top-left corner of the region.'),
        width: z.number().describe('The width of the region.'),
        height: z.number().describe('The height of the region.'),
        reason:
          z.string()
            .describe('The reason why this specific region is considered suspicious.'),
      })
    )
    .optional()
    .describe('An optional array of regions in the image that show signs of manipulation.'),
});
export type AnalyzeImageForDeepfakeOutput = z.infer<typeof AnalyzeImageForDeepfakeOutputSchema>;

export async function analyzeImageForDeepfake(
  input: AnalyzeImageForDeepfakeInput
): Promise<AnalyzeImageForDeepfakeOutput> {
  return analyzeImageForDeepfakeFlow(input);
}

const deepfakeDetectionPrompt = ai.definePrompt({
  name: 'deepfakeDetectionPrompt',
  input: { schema: AnalyzeImageForDeepfakeInputSchema },
  output: { schema: AnalyzeImageForDeepfakeOutputSchema },
  prompt: `You are an expert deepfake detection AI. Your task is to meticulously analyze the provided image for any signs of manipulation indicative of a deepfake.

Carefully examine facial features, textures, lighting inconsistencies, digital artifacts, and any other irregularities. Based on your analysis, provide a verdict, a confidence score, and a detailed explanation.

If you detect any suspicious areas, identify them and provide their coordinates (x, y, width, height) and the specific reason for their suspicion. These coordinates should be relative to the image's top-left corner (0,0).

Image to analyze: {{media url=imageDataUri}}`,
});

const analyzeImageForDeepfakeFlow = ai.defineFlow(
  {
    name: 'analyzeImageForDeepfakeFlow',
    inputSchema: AnalyzeImageForDeepfakeInputSchema,
    outputSchema: AnalyzeImageForDeepfakeOutputSchema,
  },
  async (input) => {
    const { output } = await deepfakeDetectionPrompt(input);
    if (!output) {
      throw new Error('AI did not return an output for deepfake detection.');
    }
    return output;
  }
);

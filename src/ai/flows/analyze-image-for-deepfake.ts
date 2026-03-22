
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
        x: z.number().describe('The X-coordinate (0-100 percentage) of the top-left corner.'),
        y: z.number().describe('The Y-coordinate (0-100 percentage) of the top-left corner.'),
        width: z.number().describe('The width (0-100 percentage) of the region.'),
        height: z.number().describe('The height (0-100 percentage) of the region.'),
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
  prompt: `You are a world-class forensic image analyst specializing in the detection of ultra-realistic AI manipulations. Your task is to perform an exhaustive, high-sensitivity analysis on the provided image.

Be EXTREMELY STRICT. Look beyond obvious errors and focus on:
1.  **Micro-textures**: Unnatural smoothing in skin pores, inconsistent hair patterns, or digital noise that follows content boundaries.
2.  **Lighting and Reflection**: Mismatched catchlights in pupils, shadows that don't align with the primary light source, or inconsistent ambient occlusion.
3.  **Boundary Inconsistencies**: Subtle blurring or aliasing where a face or object meets the background.
4.  **Generative Artifacts**: Check for high-frequency patterns, unusual "tiling," or inconsistencies in clothing textures and jewelry.

IMPORTANT: When identifying highlightedRegions, use normalized PERCENTAGES (0 to 100) for the x, y, width, and height values relative to the full image dimensions.

If there is even a minor, localized inconsistency that suggests GAN or Diffusion model output, flag it as suspicious.

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

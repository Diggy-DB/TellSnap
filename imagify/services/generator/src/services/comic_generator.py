"""
Comic Generator - Generates manga/manhwa style comic pages using AI image generation.

This service takes expanded scripts and generates comic panels
using Google's Imagen 3 model via the Vertex AI SDK, with DALL-E 3 as fallback.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import tempfile
import time
import json
import base64
import io
import structlog
from PIL import Image
import httpx

from google import genai
from google.genai import types
from openai import OpenAI

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class PanelResult:
    """Result of a single panel generation."""
    panel_index: int
    image_path: Path
    description: str
    dialogue: list[dict[str, str]]
    width: int
    height: int


@dataclass
class ComicPageResult:
    """Result of comic page generation."""
    page_path: Path  # Path to the final composed page
    panel_paths: list[Path]  # Individual panel images
    thumbnail_path: Path | None
    num_panels: int
    width: int
    height: int
    generation_id: str
    style: str


class ComicGenerationError(Exception):
    """Error during comic generation."""
    pass


class ComicGenerator:
    """
    Generates comic/manga style pages using Nano Banana Pro (primary), DALL-E 3, or Imagen 3 (fallback).
    
    Nano Banana Pro from apifree.ai is preferred for high-quality 4K manga/stylized art.
    """

    def __init__(self):
        # Initialize Apifree client for Nano Banana Pro (primary - best quality)
        self.apifree_client = None
        self.use_apifree_primary = False
        
        if settings.apifree_api_key:
            self.apifree_client = OpenAI(
                base_url=settings.apifree_base_url,
                api_key=settings.apifree_api_key
            )
            self.use_apifree_primary = True
            logger.info("Nano Banana Pro enabled as primary generator", base_url=settings.apifree_base_url)
        
        # Initialize OpenAI client for DALL-E 3 (secondary)
        self.openai_client = None
        self.use_dalle_primary = False  # Only use if apifree not available
        
        if settings.openai_api_key:
            self.openai_client = OpenAI(api_key=settings.openai_api_key)
            if not self.use_apifree_primary:
                self.use_dalle_primary = True
                logger.info("DALL-E 3 enabled as primary generator")
            else:
                logger.info("DALL-E 3 available as fallback")
        
        # Use service account for Imagen 3 as fallback
        if settings.google_application_credentials:
            import os
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
            self.client = genai.Client(
                vertexai=True,
                project=settings.google_cloud_project,
                location="us-central1"
            )
            logger.info("Imagen 3 available as fallback", project=settings.google_cloud_project)
        else:
            self.client = genai.Client(api_key=settings.google_ai_api_key) if settings.google_ai_api_key else None
        
        self.image_model = "imagen-3.0-generate-002"  # Imagen 3 model

    def generate(
        self,
        panel_prompts: list[dict[str, Any]],
        scene_bible: dict[str, Any] | None = None,
        style: str = "manga",  # manga, manhwa, western_comic
        page_layout: str = "auto",  # auto, grid_2x2, vertical_3, horizontal_2
        aspect_ratio: str = "9:16",  # Portrait for manga
        user_prompt: str = "",  # Original user story prompt for context
    ) -> ComicPageResult:
        """
        Generate a comic page from panel prompts.
        
        Args:
            panel_prompts: List of dicts with 'description' and 'dialogue' for each panel
            scene_bible: Scene Bible for character/style consistency
            style: Art style (manga, manhwa, western_comic)
            page_layout: Layout for panels on the page
            aspect_ratio: Aspect ratio of the final page
            
        Returns:
            ComicPageResult with the generated comic page
        """
        logger.info(
            "Starting comic page generation",
            num_panels=len(panel_prompts),
            style=style,
            layout=page_layout,
        )

        # Determine panel count
        num_panels = len(panel_prompts)
        if num_panels < 1:
            raise ComicGenerationError("At least 1 panel is required")
        if num_panels > 6:
            num_panels = 6  # Cap at 6 panels per page
            panel_prompts = panel_prompts[:6]

        # Generate individual panels
        panels: list[PanelResult] = []
        temp_dir = Path(tempfile.mkdtemp())
        
        for idx, panel_data in enumerate(panel_prompts):
            panel_result = self._generate_panel(
                panel_index=idx,
                description=panel_data.get("description", ""),
                dialogue=panel_data.get("dialogue", []),
                scene_bible=scene_bible,
                style=style,
                output_dir=temp_dir,
                user_prompt=user_prompt,
            )
            panels.append(panel_result)
            logger.info(f"Generated panel {idx + 1}/{num_panels}")

        # Compose panels into a page
        page_result = self._compose_page(
            panels=panels,
            style=style,
            layout=page_layout,
            aspect_ratio=aspect_ratio,
            output_dir=temp_dir,
        )

        return page_result

    def _generate_panel(
        self,
        panel_index: int,
        description: str,
        dialogue: list[dict[str, str]],
        scene_bible: dict[str, Any] | None,
        style: str,
        output_dir: Path,
        user_prompt: str = "",
    ) -> PanelResult:
        """Generate a single comic panel."""
        
        # Build the prompt with style instructions
        style_instructions = self._get_style_instructions(style)
        character_context = self._get_character_context(scene_bible)
        
        # Include dialogue context in the prompt
        dialogue_context = ""
        if dialogue:
            dialogue_context = "\nCharacters speaking: " + ", ".join(
                [f"{d.get('character', 'Character')}" for d in dialogue]
            )
        
        # Include original user prompt for context (important for specific character details)
        story_context = ""
        if user_prompt:
            story_context = f"\n\nStory context (include all specific details mentioned): {user_prompt}"
        
        full_prompt = f"""{style_instructions}

Scene: {description}{dialogue_context}{story_context}

{character_context}

CRITICAL: Do NOT include any text, speech bubbles, captions, or written words in the image.
Focus on dynamic poses, expressive characters, and dramatic composition.
Include all specific character transformations, forms, and details mentioned in the story context."""

        try:
            # Use Nano Banana Pro as primary (best quality)
            if self.use_apifree_primary and self.apifree_client:
                try:
                    return self._generate_panel_apifree(
                        panel_index=panel_index,
                        description=description,
                        dialogue=dialogue,
                        scene_bible=scene_bible,
                        style=style,
                        output_dir=output_dir,
                        full_prompt=full_prompt,
                    )
                except ComicGenerationError as apifree_error:
                    error_str = str(apifree_error)
                    logger.warning("Nano Banana Pro failed, trying DALL-E 3", 
                                 panel_index=panel_index, error=error_str[:100])
                    # Fall through to DALL-E 3
            
            # Use DALL-E 3 as secondary
            if self.openai_client:
                try:
                    return self._generate_panel_dalle(
                        panel_index=panel_index,
                        description=description,
                        dialogue=dialogue,
                        scene_bible=scene_bible,
                        style=style,
                        output_dir=output_dir,
                        full_prompt=full_prompt,
                    )
                except ComicGenerationError as dalle_error:
                    # If DALL-E fails (content policy, etc.), fall back to Imagen 3
                    error_str = str(dalle_error)
                    if "content_policy" in error_str or "safety" in error_str.lower():
                        logger.warning("DALL-E content policy error, falling back to Imagen 3", 
                                     panel_index=panel_index, error=error_str[:100])
                        # Continue to Imagen 3 below
                    else:
                        raise  # Re-raise if it's a different error
            
            # Use Imagen 3 (primary if DALL-E not enabled, or fallback)
            logger.info("Calling Imagen 3 API", panel_index=panel_index)
            
            response = self.client.models.generate_images(
                model=self.image_model,
                prompt=full_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="3:4",  # Portrait for manga panels
                    safety_filter_level="BLOCK_ONLY_HIGH",
                    person_generation="ALLOW_ADULT",
                ),
            )
            
            # Save the generated image
            if response.generated_images and len(response.generated_images) > 0:
                generated_image = response.generated_images[0]
                
                # Get image bytes
                if hasattr(generated_image, 'image') and generated_image.image:
                    image_data = generated_image.image
                    if hasattr(image_data, 'image_bytes') and image_data.image_bytes:
                        image_bytes = image_data.image_bytes
                    else:
                        raise ComicGenerationError("No image bytes in response")
                else:
                    raise ComicGenerationError("No image in response")
                
                # Save panel image
                panel_path = output_dir / f"panel_{panel_index}.png"
                with open(panel_path, 'wb') as f:
                    f.write(image_bytes)
                
                # Get dimensions
                img = Image.open(panel_path)
                width, height = img.size
                img.close()
                
                return PanelResult(
                    panel_index=panel_index,
                    image_path=panel_path,
                    description=description,
                    dialogue=dialogue,
                    width=width,
                    height=height,
                )
            else:
                raise ComicGenerationError("No images generated")

        except Exception as e:
            error_str = str(e)
            # Check if it's a quota error or other error - try alternative
            if self.openai_client and not self.use_dalle_primary:
                logger.warning("Imagen 3 failed, trying DALL-E 3", panel_index=panel_index, error=error_str[:100])
                return self._generate_panel_dalle(
                    panel_index=panel_index,
                    description=description,
                    dialogue=dialogue,
                    scene_bible=scene_bible,
                    style=style,
                    output_dir=output_dir,
                    full_prompt=full_prompt,
                )
            logger.error("Panel generation failed", panel_index=panel_index, error=str(e))
            raise ComicGenerationError(f"Failed to generate panel {panel_index}: {e}")

    def _generate_panel_apifree(
        self,
        panel_index: int,
        description: str,
        dialogue: list[dict[str, str]],
        scene_bible: dict[str, Any] | None,
        style: str,
        output_dir: Path,
        full_prompt: str,
    ) -> PanelResult:
        """Generate a single comic panel using Nano Banana Pro via apifree.ai."""
        
        if not self.apifree_client:
            raise ComicGenerationError("Apifree not available - no API key configured")
        
        try:
            logger.info("Calling Nano Banana Pro API", panel_index=panel_index)
            
            # Build manga-optimized prompt for Nano Banana Pro
            manga_prompt = f"""Professional Japanese manga illustration, black and white with screentone shading.

{full_prompt}

Art style requirements:
- Clean professional manga linework with precise ink strokes
- High contrast black and white with detailed screentone/halftone shading
- Expressive anime-style character faces with large detailed eyes
- Dynamic action poses with motion lines and speed effects
- Dramatic camera angles and cinematic composition
- NO TEXT, NO SPEECH BUBBLES, NO WRITTEN WORDS, NO LETTERS, NO CAPTIONS
- Leave space for dialogue bubbles to be added later
- Professional manga panel composition"""
            
            # Use OpenAI-compatible images.generate endpoint
            response = self.apifree_client.images.generate(
                model=settings.apifree_image_model,  # google/nano-banana-pro
                prompt=manga_prompt[:4000],
                size="1024x1792",  # Portrait for manga
                n=1,
            )
            
            # Download the image
            image_url = response.data[0].url
            logger.info("Nano Banana Pro image generated, downloading", panel_index=panel_index)
            
            # Download image bytes
            with httpx.Client(timeout=60.0) as client:
                img_response = client.get(image_url)
                img_response.raise_for_status()
                image_bytes = img_response.content
            
            # Save panel image
            panel_path = output_dir / f"panel_{panel_index}.png"
            with open(panel_path, 'wb') as f:
                f.write(image_bytes)
            
            # Get dimensions
            img = Image.open(panel_path)
            width, height = img.size
            img.close()
            
            logger.info("Nano Banana Pro panel generated successfully", panel_index=panel_index)
            
            return PanelResult(
                panel_index=panel_index,
                image_path=panel_path,
                description=description,
                dialogue=dialogue,
                width=width,
                height=height,
            )
            
        except Exception as e:
            logger.error("Nano Banana Pro panel generation failed", panel_index=panel_index, error=str(e))
            raise ComicGenerationError(f"Failed to generate panel {panel_index} with Nano Banana Pro: {e}")

    def _rewrite_prompt_for_dalle(self, prompt: str) -> str:
        """Use GPT-4 to rewrite the prompt to be DALL-E safe (like ChatGPT does internally)."""
        if not self.openai_client:
            return prompt
        
        try:
            logger.info("Rewriting prompt for DALL-E safety")
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a prompt rewriter for DALL-E 3 manga image generation.
Your job is to create a clean, safe image prompt that will generate high-quality manga art.

CRITICAL RULES:
1. REMOVE all references to text, speech, dialogue, captions, words, letters, or writing
2. REMOVE all character names - describe them visually instead (e.g., "spiky-haired martial artist" not "Goku")
3. Replace action words: attack→dynamic pose, fight→confrontation, battle→showdown, punch→striking motion
4. Focus ONLY on visual composition: poses, expressions, camera angles, lighting
5. Describe the ART, not the story
6. Keep under 500 words
7. End with: "Clean manga illustration with no text or speech bubbles."

Output ONLY the rewritten prompt."""
                    },
                    {
                        "role": "user",
                        "content": f"Rewrite for DALL-E 3 manga generation:\n\n{prompt}"
                    }
                ],
                max_tokens=800,
                temperature=0.3,
            )
            rewritten = response.choices[0].message.content.strip()
            logger.info("Prompt rewritten successfully", original_len=len(prompt), rewritten_len=len(rewritten))
            return rewritten
        except Exception as e:
            logger.warning("Failed to rewrite prompt, using original", error=str(e))
            return prompt

    def _generate_panel_dalle(
        self,
        panel_index: int,
        description: str,
        dialogue: list[dict[str, str]],
        scene_bible: dict[str, Any] | None,
        style: str,
        output_dir: Path,
        full_prompt: str,
    ) -> PanelResult:
        """Generate a single comic panel using DALL-E 3."""
        
        if not self.openai_client:
            raise ComicGenerationError("DALL-E not available - no OpenAI API key configured")
        
        try:
            logger.info("Calling DALL-E 3 API", panel_index=panel_index)
            
            # Rewrite prompt using GPT-4 (like ChatGPT does internally)
            safe_prompt = self._rewrite_prompt_for_dalle(full_prompt)
            
            # Enhanced DALL-E 3 prompt - VERY explicit about no text
            dalle_prompt = f"""Create a single manga panel illustration:

{safe_prompt}

STYLE: Professional Japanese manga art. Black and white with screentone shading. Dynamic composition with dramatic angles. Expressive anime-style faces. Clean bold linework.

ABSOLUTELY NO TEXT OF ANY KIND. No speech bubbles. No sound effects. No captions. No letters. No words. No writing. The image must be completely text-free. Leave empty space where speech bubbles would normally go."""
            
            response = self.openai_client.images.generate(
                model="dall-e-3",
                prompt=dalle_prompt[:4000],  # DALL-E has 4000 char limit
                size="1024x1792",  # Portrait orientation for manga
                quality="hd",  # Use HD quality for better results
                style="vivid",  # More dramatic/stylized
                n=1,
            )
            
            # Download the image
            image_url = response.data[0].url
            logger.info("DALL-E image generated, downloading", panel_index=panel_index)
            
            # Download image bytes
            with httpx.Client() as client:
                img_response = client.get(image_url)
                img_response.raise_for_status()
                image_bytes = img_response.content
            
            # Save panel image
            panel_path = output_dir / f"panel_{panel_index}.png"
            with open(panel_path, 'wb') as f:
                f.write(image_bytes)
            
            # Get dimensions
            img = Image.open(panel_path)
            width, height = img.size
            img.close()
            
            logger.info("DALL-E panel generated successfully", panel_index=panel_index)
            
            return PanelResult(
                panel_index=panel_index,
                image_path=panel_path,
                description=description,
                dialogue=dialogue,
                width=width,
                height=height,
            )
            
        except Exception as e:
            logger.error("DALL-E panel generation failed", panel_index=panel_index, error=str(e))
            raise ComicGenerationError(f"Failed to generate panel {panel_index} with DALL-E: {e}")

    def _compose_page(
        self,
        panels: list[PanelResult],
        style: str,
        layout: str,
        aspect_ratio: str,
        output_dir: Path,
    ) -> ComicPageResult:
        """Compose individual panels into a comic page with speech bubbles."""
        
        # Determine page dimensions based on aspect ratio
        if aspect_ratio == "9:16":
            page_width, page_height = 1080, 1920  # Portrait
        elif aspect_ratio == "16:9":
            page_width, page_height = 1920, 1080  # Landscape
        else:
            page_width, page_height = 1080, 1440  # 3:4
        
        # Create the page image
        page = Image.new('RGB', (page_width, page_height), color='white')
        
        # Determine layout based on panel count
        num_panels = len(panels)
        
        if layout == "auto":
            if num_panels == 1:
                layout = "single"
            elif num_panels == 2:
                layout = "vertical_2"
            elif num_panels == 3:
                layout = "vertical_3"
            elif num_panels == 4:
                layout = "grid_2x2"
            elif num_panels == 5:
                layout = "mixed_5"
            else:
                layout = "grid_3x2"
        
        # Calculate panel positions
        positions = self._calculate_layout(layout, page_width, page_height, num_panels)
        
        # Paste panels onto page
        panel_paths = []
        for panel, (x, y, w, h) in zip(panels, positions):
            img = Image.open(panel.image_path)
            # Resize to fit with aspect ratio preservation (cover mode with center crop)
            img = self._resize_cover(img, w, h)
            page.paste(img, (x, y))
            panel_paths.append(panel.image_path)
            img.close()
        
        # Add manga-style panel borders
        self._add_panel_borders(page, positions, style)
        
        # Add speech bubbles with dialogue
        self._add_speech_bubbles(page, panels, positions, style)
        
        # Save the composed page
        page_path = output_dir / f"comic_page_{int(time.time() * 1000)}.png"
        page.save(page_path, 'PNG', quality=95)
        
        # Create thumbnail
        thumbnail = page.copy()
        thumbnail.thumbnail((400, 600), Image.Resampling.LANCZOS)
        thumbnail_path = output_dir / "thumbnail.jpg"
        thumbnail.save(thumbnail_path, 'JPEG', quality=85)
        thumbnail.close()
        
        page.close()
        
        return ComicPageResult(
            page_path=page_path,
            panel_paths=panel_paths,
            thumbnail_path=thumbnail_path,
            num_panels=num_panels,
            width=page_width,
            height=page_height,
            generation_id=f"comic_{int(time.time() * 1000)}",
            style=style,
        )

    def _resize_cover(self, img: Image.Image, target_w: int, target_h: int) -> Image.Image:
        """
        Resize image to cover target dimensions while preserving aspect ratio.
        Centers and crops to fit exactly.
        """
        orig_w, orig_h = img.size
        
        # Calculate scale to cover the target area
        scale_w = target_w / orig_w
        scale_h = target_h / orig_h
        scale = max(scale_w, scale_h)  # Use larger scale to cover
        
        # Resize to cover
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center crop to target size
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        right = left + target_w
        bottom = top + target_h
        
        return img.crop((left, top, right, bottom))

    def _calculate_layout(
        self, 
        layout: str, 
        page_width: int, 
        page_height: int, 
        num_panels: int
    ) -> list[tuple[int, int, int, int]]:
        """Calculate panel positions based on layout. Returns list of (x, y, width, height)."""
        
        margin = 20
        gutter = 15
        
        usable_width = page_width - (2 * margin)
        usable_height = page_height - (2 * margin)
        
        positions = []
        
        if layout == "single":
            positions.append((margin, margin, usable_width, usable_height))
            
        elif layout == "vertical_2":
            panel_height = (usable_height - gutter) // 2
            positions.append((margin, margin, usable_width, panel_height))
            positions.append((margin, margin + panel_height + gutter, usable_width, panel_height))
            
        elif layout == "vertical_3":
            panel_height = (usable_height - 2 * gutter) // 3
            for i in range(3):
                y = margin + i * (panel_height + gutter)
                positions.append((margin, y, usable_width, panel_height))
                
        elif layout == "grid_2x2":
            panel_width = (usable_width - gutter) // 2
            panel_height = (usable_height - gutter) // 2
            for row in range(2):
                for col in range(2):
                    x = margin + col * (panel_width + gutter)
                    y = margin + row * (panel_height + gutter)
                    positions.append((x, y, panel_width, panel_height))
                    
        elif layout == "mixed_5":
            # Top row: 2 panels, middle: 1 wide, bottom: 2 panels
            panel_width = (usable_width - gutter) // 2
            row_height = (usable_height - 2 * gutter) // 3
            
            # Top row
            positions.append((margin, margin, panel_width, row_height))
            positions.append((margin + panel_width + gutter, margin, panel_width, row_height))
            
            # Middle (wide)
            positions.append((margin, margin + row_height + gutter, usable_width, row_height))
            
            # Bottom row
            positions.append((margin, margin + 2 * (row_height + gutter), panel_width, row_height))
            positions.append((margin + panel_width + gutter, margin + 2 * (row_height + gutter), panel_width, row_height))
            
        elif layout == "grid_3x2":
            panel_width = (usable_width - gutter) // 2
            panel_height = (usable_height - 2 * gutter) // 3
            idx = 0
            for row in range(3):
                for col in range(2):
                    if idx < num_panels:
                        x = margin + col * (panel_width + gutter)
                        y = margin + row * (panel_height + gutter)
                        positions.append((x, y, panel_width, panel_height))
                        idx += 1
        else:
            # Default: vertical stack
            panel_height = (usable_height - (num_panels - 1) * gutter) // num_panels
            for i in range(num_panels):
                y = margin + i * (panel_height + gutter)
                positions.append((margin, y, usable_width, panel_height))
        
        return positions[:num_panels]

    def _add_panel_borders(
        self, 
        page: Image.Image, 
        positions: list[tuple[int, int, int, int]], 
        style: str
    ):
        """Add panel borders to the comic page."""
        from PIL import ImageDraw
        
        draw = ImageDraw.Draw(page)
        border_width = 3 if style in ["manga", "manhwa"] else 2
        border_color = "black"
        
        for x, y, w, h in positions:
            draw.rectangle(
                [x, y, x + w, y + h],
                outline=border_color,
                width=border_width,
            )

    def _add_speech_bubbles(
        self,
        page: Image.Image,
        panels: list[PanelResult],
        positions: list[tuple[int, int, int, int]],
        style: str,
    ):
        """Add speech bubbles with dialogue to panels."""
        from PIL import ImageDraw, ImageFont
        
        draw = ImageDraw.Draw(page)
        
        # Try to use a proper font, fall back to default
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
            small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 12)
        except:
            font = ImageFont.load_default()
            small_font = font
        
        for panel, (x, y, w, h) in zip(panels, positions):
            if not panel.dialogue:
                continue
            
            # Position bubbles within the panel
            bubble_y = y + 15
            
            for dialog in panel.dialogue[:2]:  # Max 2 bubbles per panel
                text = dialog.get("text", "")
                character = dialog.get("character", "")
                
                if not text:
                    continue
                
                # Wrap text
                max_chars = 25
                lines = []
                words = text.split()
                current_line = ""
                for word in words:
                    if len(current_line) + len(word) + 1 <= max_chars:
                        current_line += (" " if current_line else "") + word
                    else:
                        if current_line:
                            lines.append(current_line)
                        current_line = word
                if current_line:
                    lines.append(current_line)
                
                if not lines:
                    continue
                
                # Calculate bubble size
                line_height = 20
                bubble_padding = 12
                bubble_width = min(w - 40, max(len(line) * 8 for line in lines) + bubble_padding * 2)
                bubble_height = len(lines) * line_height + bubble_padding * 2
                
                bubble_x = x + 20
                
                # Draw rounded rectangle bubble
                draw.rounded_rectangle(
                    [bubble_x, bubble_y, bubble_x + bubble_width, bubble_y + bubble_height],
                    radius=15,
                    fill="white",
                    outline="black",
                    width=2,
                )
                
                # Draw text
                text_y = bubble_y + bubble_padding
                for line in lines:
                    draw.text(
                        (bubble_x + bubble_padding, text_y),
                        line,
                        fill="black",
                        font=font,
                    )
                    text_y += line_height
                
                bubble_y += bubble_height + 10

    def _get_style_instructions(self, style: str) -> str:
        """Get style-specific prompt instructions."""
        styles = {
            "manga": """Art style: Japanese manga style illustration.
- Black and white with screentone shading
- Expressive anime-style eyes and features
- Dynamic action lines and speed effects
- Clean linework with varying line weights
- Dramatic camera angles and compositions""",
            
            "manhwa": """Art style: Korean manhwa style illustration.
- Full color with soft gradients
- Beautiful, detailed character designs
- Romantic and elegant aesthetic
- Smooth, flowing linework
- Cinematic compositions""",
            
            "western_comic": """Art style: American comic book style illustration.
- Bold colors with strong contrast
- Muscular, heroic proportions
- Heavy inking and dynamic shadows
- Action-packed compositions
- Comic book coloring style""",
            
            "webtoon": """Art style: Modern webtoon style illustration.
- Full color with vibrant palette
- Clean, modern character designs
- Soft shading and lighting
- Minimal backgrounds with focus on characters
- Vertical scrolling optimized composition""",
        }
        return styles.get(style, styles["manga"])

    def _get_character_context(self, scene_bible: dict[str, Any] | None) -> str:
        """Extract character descriptions from scene bible."""
        if not scene_bible:
            return ""
        
        characters = scene_bible.get("characters", {})
        if not characters:
            return ""
        
        descriptions = []
        for name, data in characters.items():
            if isinstance(data, dict):
                appearance = data.get("appearance", "")
                if appearance:
                    descriptions.append(f"- {name}: {appearance}")
        
        if descriptions:
            return "Character reference:\n" + "\n".join(descriptions)
        return ""

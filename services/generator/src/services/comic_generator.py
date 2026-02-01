"""
Comic Generator - Generates manga/manhwa style comic pages using AI image generation.

This service takes expanded scripts and generates comic panels
using Google's Imagen 3 model via the Vertex AI SDK.
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

from google import genai
from google.genai import types

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
    Generates comic/manga style pages using Google Imagen 3.
    
    Creates multi-panel comic pages with consistent art style.
    """

    def __init__(self):
        # Use service account if credentials file is set
        if settings.google_application_credentials:
            import os
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
            self.client = genai.Client(
                vertexai=True,
                project=settings.google_cloud_project,
                location="us-central1"
            )
            logger.info("Using Vertex AI with service account", project=settings.google_cloud_project)
        else:
            self.client = genai.Client(api_key=settings.google_ai_api_key)
            logger.info("Using Google AI Studio with API key")
        
        self.image_model = "imagen-3.0-generate-002"  # Imagen 3 model

    def generate(
        self,
        panel_prompts: list[dict[str, Any]],
        scene_bible: dict[str, Any] | None = None,
        style: str = "manga",  # manga, manhwa, western_comic
        page_layout: str = "auto",  # auto, grid_2x2, vertical_3, horizontal_2
        aspect_ratio: str = "9:16",  # Portrait for manga
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
        
        full_prompt = f"""{style_instructions}

Scene: {description}{dialogue_context}

{character_context}

Important: Generate a single comic panel. No speech bubbles or text - those will be added later. 
Focus on dynamic poses, expressive characters, and dramatic composition."""

        try:
            # Generate image using Imagen 3
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
            logger.error("Panel generation failed", panel_index=panel_index, error=str(e))
            raise ComicGenerationError(f"Failed to generate panel {panel_index}: {e}")

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
            # Resize to fit the allocated space
            img = img.resize((w, h), Image.Resampling.LANCZOS)
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

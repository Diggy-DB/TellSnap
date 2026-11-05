"""
Script Expander - Transforms user prompts into detailed comic panel descriptions using OpenAI.

This service takes user-submitted prompts and expands them into detailed
comic panel descriptions that include scene descriptions, character details,
dialogue, and visual notes suitable for comic/manga generation.
"""

from dataclasses import dataclass
from typing import Any
import json
import openai
import structlog

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class PanelDescription:
    """Description for a single comic panel."""
    panel_index: int
    description: str  # Visual description for image generation
    dialogue: list[dict[str, str]]  # Character dialogue for speech bubbles
    action: str  # What's happening in this panel
    emotion: str  # Dominant emotion/mood


@dataclass
class ExpandedScript:
    """Result of script expansion for comic generation."""
    full_script: str
    scene_description: str
    character_descriptions: dict[str, str]
    actions: list[str]
    dialogue: list[dict[str, str]]
    visual_notes: str
    panel_layout: str  # Suggested panel layout
    mood_and_atmosphere: str
    num_panels: int  # Number of panels for this segment
    panels: list[PanelDescription]  # Individual panel descriptions
    comic_style: str  # manga, manhwa, western_comic, webtoon
    genre: str = "action"  # Detected genre: action, romance, comedy, thriller, slice-of-life, fantasy
    raw_response: str = ""


@dataclass
class PreviousSegment:
    """Context from a previous segment in the scene."""
    order_index: int
    prompt: str
    expanded_script: str | None
    image_url: str | None  # Comic page URL


class ScriptExpander:
    """
    Expands user prompts into detailed comic panel descriptions using OpenAI ChatGPT.
    
    The expander takes into account:
    - The user's submitted prompt/script
    - Previous segments in the scene for continuity
    - The scene bible (characters, locations, style guide)
    - The overall scene context
    """

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def expand(
        self,
        user_prompt: str,
        scene_context: dict[str, Any],
        scene_bible: dict[str, Any] | None = None,
        previous_segments: list[PreviousSegment] | None = None,
        comic_style: str = "manga",
    ) -> ExpandedScript:
        """
        Expand a user prompt into detailed comic panel descriptions.
        
        Args:
            user_prompt: The user's submitted story prompt
            scene_context: Context about the scene (title, description, topic)
            scene_bible: Existing Scene Bible with characters, locations, timeline
            previous_segments: List of previous segments for continuity
            comic_style: Style of comic (manga, manhwa, western_comic, webtoon)
            
        Returns:
            ExpandedScript with panel descriptions for comic generation
        """
        logger.info(
            "Expanding script for comic",
            prompt_length=len(user_prompt),
            has_bible=scene_bible is not None,
            num_previous=len(previous_segments) if previous_segments else 0,
            style=comic_style,
        )

        system_prompt = self._build_system_prompt(scene_bible, comic_style)
        user_message = self._build_user_message(
            user_prompt, scene_context, scene_bible, previous_segments, comic_style
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )

            raw_response = response.choices[0].message.content or "{}"
            result = json.loads(raw_response)
            
            logger.info("Script expansion complete", result_keys=list(result.keys()))

            # Parse panel descriptions
            panels = []
            for panel_data in result.get("panels", []):
                panels.append(PanelDescription(
                    panel_index=panel_data.get("panel_index", len(panels)),
                    description=panel_data.get("description", ""),
                    dialogue=panel_data.get("dialogue", []),
                    action=panel_data.get("action", ""),
                    emotion=panel_data.get("emotion", "neutral"),
                ))

            return ExpandedScript(
                full_script=result.get("full_script", ""),
                scene_description=result.get("scene_description", ""),
                character_descriptions=result.get("character_descriptions", {}),
                actions=result.get("actions", []),
                dialogue=result.get("dialogue", []),
                visual_notes=result.get("visual_notes", ""),
                panel_layout=result.get("panel_layout", "vertical_3"),
                mood_and_atmosphere=result.get("mood_and_atmosphere", ""),
                num_panels=result.get("num_panels", len(panels)),
                panels=panels,
                comic_style=comic_style,
                genre=result.get("genre", "action"),
                raw_response=raw_response,
            )

        except json.JSONDecodeError as e:
            logger.error("Failed to parse script expansion response", error=str(e))
            # Fallback to simple expansion
            return self._fallback_expand(user_prompt, scene_context, comic_style)
        except Exception as e:
            logger.error("Script expansion failed", error=str(e))
            raise

    def _build_system_prompt(self, scene_bible: dict[str, Any] | None, comic_style: str) -> str:
        """Build the system prompt for ChatGPT for comic generation."""
        
        style_instructions = {
            "manga": "Japanese manga style with expressive eyes, dynamic action lines, and dramatic compositions",
            "manhwa": "Korean manhwa style with beautiful character designs, soft gradients, and romantic aesthetics",
            "western_comic": "American comic book style with bold colors, muscular proportions, and heavy inking",
            "webtoon": "Modern webtoon style with vibrant colors, clean designs, and vertical scrolling format",
        }
        
        style_desc = style_instructions.get(comic_style, style_instructions["manga"])
        
        prompt = f"""You are an expert comic/manga writer and artist specializing in {comic_style} style storytelling.

Your task is to transform brief story prompts into detailed comic panel descriptions optimized for AI image generation.

## Art Style
{style_desc}

## Guidelines

1. **Panel Composition**: Create dynamic, visually interesting panel layouts
2. **Visual Storytelling**: Show, don't tell - use facial expressions and body language
3. **Continuity**: Maintain character appearances consistent with the scene bible
4. **Dialogue**: Write natural, expressive dialogue for speech bubbles
5. **Pacing**: Use panel count and size to control story pacing
6. **Emotions**: Exaggerate emotions in the {comic_style} tradition

## Output Format

You MUST respond with a valid JSON object containing these fields:

{{
    "full_script": "Complete narrative script with all details",
    "scene_description": "Detailed description of the setting, lighting, atmosphere",
    "character_descriptions": {{
        "character_name": "Visual description for this scene"
    }},
    "actions": ["Action 1", "Action 2", "Action 3"],
    "dialogue": [
        {{"character": "Name", "line": "What they say"}}
    ],
    "visual_notes": "Art style notes, special effects, emotional emphasis",
    "panel_layout": "vertical_3 or grid_2x2 or mixed_5 etc.",
    "mood_and_atmosphere": "Overall emotional tone and visual atmosphere",
    \"genre\": "action",  // One of: action, romance, comedy, thriller, slice-of-life, fantasy
    "num_panels": 3,
    "panels": [
        {{
            "panel_index": 0,
            "description": "Detailed visual description for image generation (100-150 words)",
            "dialogue": [
                {{"character": "Name", "text": "What they say in this panel"}}
            ],
            "action": "What happens in this panel",
            "emotion": "dominant emotion"
        }}
    ]
}}

## Panel Description Guidelines

Each panel description should include:
- Character positions and poses
- Facial expressions (in {comic_style} style)
- Background and setting details
- Lighting and atmosphere
- Camera angle (close-up, medium shot, wide shot)
- Any motion or action effects

Aim for 3-5 panels per page. Maximum 6 panels.
"""

        if scene_bible:
            prompt += "\n\n## Scene Bible (Maintain Continuity)\n\n"
            
            # Add characters
            characters = scene_bible.get("characters", {})
            if characters:
                prompt += "### Characters\n"
                for char_id, char in characters.items():
                    name = char.get("name", char_id)
                    visual = char.get("visualPrompt", char.get("description", ""))
                    traits = char.get("traits", [])
                    prompt += f"- **{name}**: {visual}"
                    if traits:
                        prompt += f" (Traits: {', '.join(traits)})"
                    prompt += "\n"
            
            # Add locations
            locations = scene_bible.get("locations", {})
            if locations:
                prompt += "\n### Locations\n"
                for loc_id, loc in locations.items():
                    name = loc.get("name", loc_id)
                    visual = loc.get("visualPrompt", loc.get("description", ""))
                    prompt += f"- **{name}**: {visual}\n"
            
            # Add style guide
            rules = scene_bible.get("rules", {})
            if rules:
                prompt += "\n### Style Guide\n"
                if "visualStyle" in rules:
                    prompt += f"- Visual Style: {rules['visualStyle']}\n"
                if "colorPalette" in rules:
                    prompt += f"- Color Palette: {', '.join(rules['colorPalette'])}\n"
                if "mood" in rules:
                    prompt += f"- Mood: {rules['mood']}\n"

        return prompt

    def _build_user_message(
        self,
        user_prompt: str,
        scene_context: dict[str, Any],
        scene_bible: dict[str, Any] | None,
        previous_segments: list[PreviousSegment] | None,
        comic_style: str,
    ) -> str:
        """Build the user message with all context."""
        
        message_parts = []
        
        # Scene context
        message_parts.append("## Scene Context")
        message_parts.append(f"**Title**: {scene_context.get('title', 'Untitled')}")
        if scene_context.get("description"):
            message_parts.append(f"**Description**: {scene_context['description']}")
        if scene_context.get("topic"):
            message_parts.append(f"**Topic/Genre**: {scene_context['topic']}")
        message_parts.append(f"**Comic Style**: {comic_style}")
        
        # Previous segments for continuity
        if previous_segments:
            message_parts.append("\n## Previous Segments (for continuity)")
            for seg in previous_segments[-3:]:  # Last 3 segments max
                message_parts.append(f"\n### Segment {seg.order_index}")
                message_parts.append(f"**Prompt**: {seg.prompt}")
                if seg.expanded_script:
                    # Truncate long scripts
                    script_preview = seg.expanded_script[:500]
                    if len(seg.expanded_script) > 500:
                        script_preview += "..."
                    message_parts.append(f"**Script**: {script_preview}")
        
        # Current user prompt
        message_parts.append("\n## User's New Prompt (expand this into comic panels)")
        message_parts.append(user_prompt)
        
        # Instructions
        message_parts.append("\n## Instructions")
        message_parts.append("1. Expand the user's prompt into detailed comic panel descriptions")
        message_parts.append("2. Create 3-5 panels that tell this part of the story")
        message_parts.append("3. Each panel description should be detailed enough for image generation")
        message_parts.append("4. Include dialogue for speech bubbles where appropriate")
        message_parts.append("5. Maintain visual continuity with previous segments")
        message_parts.append("6. Use character descriptions from the scene bible exactly")
        message_parts.append("7. Respond with ONLY the JSON object, no markdown formatting")
        
        return "\n".join(message_parts)

    def _fallback_expand(
        self,
        user_prompt: str,
        scene_context: dict[str, Any],
        comic_style: str,
    ) -> ExpandedScript:
        """Fallback expansion when JSON parsing fails."""
        
        # Create a simple 3-panel layout
        panels = [
            PanelDescription(
                panel_index=0,
                description=f"Opening scene: {user_prompt[:100]}",
                dialogue=[],
                action="Scene establishes",
                emotion="neutral",
            ),
            PanelDescription(
                panel_index=1,
                description=f"Main action: {user_prompt}",
                dialogue=[],
                action="Main action",
                emotion="focused",
            ),
            PanelDescription(
                panel_index=2,
                description=f"Conclusion: The scene ends with a dramatic moment",
                dialogue=[],
                action="Scene concludes",
                emotion="dramatic",
            ),
        ]
        
        return ExpandedScript(
            full_script=user_prompt,
            scene_description=scene_context.get("description", ""),
            character_descriptions={},
            actions=[user_prompt],
            dialogue=[],
            visual_notes="",
            panel_layout="vertical_3",
            mood_and_atmosphere="",
            num_panels=3,
            panels=panels,
            comic_style=comic_style,
            raw_response="",
        )


# Convenience function for one-off expansions
def expand_script(
    user_prompt: str,
    scene_context: dict[str, Any],
    scene_bible: dict[str, Any] | None = None,
    previous_segments: list[dict] | None = None,
    comic_style: str = "manga",
) -> ExpandedScript:
    """
    Convenience function to expand a script for comic generation.
    
    Args:
        user_prompt: The user's story prompt
        scene_context: Scene title, description, topic
        scene_bible: Character/location data
        previous_segments: Previous segment data as dicts
        comic_style: Style of comic (manga, manhwa, western_comic, webtoon)
        
    Returns:
        ExpandedScript with panel descriptions
    """
    expander = ScriptExpander()
    
    # Convert dict segments to PreviousSegment objects
    prev_segs = None
    if previous_segments:
        prev_segs = [
            PreviousSegment(
                order_index=s.get("orderIndex", s.get("order_index", 0)),
                prompt=s.get("prompt", ""),
                expanded_script=s.get("expandedScript", s.get("expanded_script")),
                image_url=s.get("imageUrl", s.get("image_url")),
            )
            for s in previous_segments
        ]
    
    return expander.expand(user_prompt, scene_context, scene_bible, prev_segs, comic_style)

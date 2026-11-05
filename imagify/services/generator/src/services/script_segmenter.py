"""
Script Segmenter - Splits long scripts into multiple comic pages.

When a user's script is too long for a single comic page (typically 3-6 panels),
this service splits it into multiple pages that can be 
generated separately and maintain continuity.
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
class ScriptSegment:
    """A single segment/page of a split script."""
    order_index: int
    prompt: str
    scene_description: str
    num_panels_estimate: int
    continuity_notes: str  # Notes for maintaining continuity with previous/next page


@dataclass
class SegmentationResult:
    """Result of script segmentation."""
    needs_segmentation: bool
    total_duration_estimate: float  # Kept for API compatibility
    num_segments: int
    segments: list[ScriptSegment]
    original_prompt: str


class ScriptSegmenter:
    """
    Analyzes user prompts and splits them into multiple comic pages if needed.
    
    Uses OpenAI to intelligently split scripts at natural break points
    while maintaining narrative continuity.
    """

    MAX_PANELS_PER_PAGE = 6  # Max panels that fit well on a page
    TARGET_PANELS_PER_PAGE = 4  # Aim for 4 panels per page for readability
    MAX_SEGMENTS = 5  # Cap the number of pages to avoid excessive API calls

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def analyze_and_segment(
        self,
        user_prompt: str,
        scene_context: dict[str, Any] | None = None,
        scene_bible: dict[str, Any] | None = None,
    ) -> SegmentationResult:
        """
        Analyze a user prompt and split it into pages if needed.
        
        Args:
            user_prompt: The user's full story/script prompt
            scene_context: Context about the scene
            scene_bible: Existing Scene Bible with characters, locations, style
            
        Returns:
            SegmentationResult with pages if splitting is needed
        """
        logger.info("Analyzing script for segmentation", prompt_length=len(user_prompt))

        # First, estimate number of panels needed
        panel_estimate = self._estimate_panels(user_prompt)
        
        logger.info("Panel estimate", panels=panel_estimate)
        
        if panel_estimate <= self.MAX_PANELS_PER_PAGE:
            # No segmentation needed - fits on one page
            return SegmentationResult(
                needs_segmentation=False,
                total_duration_estimate=panel_estimate * 2,
                num_segments=1,
                segments=[
                    ScriptSegment(
                        order_index=1,
                        prompt=user_prompt,
                        scene_description="",
                        num_panels_estimate=panel_estimate,
                        continuity_notes="Single page, no continuity concerns.",
                    )
                ],
                original_prompt=user_prompt,
            )

        # Need to segment - use AI to split intelligently
        segments = self._split_script(user_prompt, panel_estimate, scene_context, scene_bible)
        
        return SegmentationResult(
            needs_segmentation=True,
            total_duration_estimate=panel_estimate * 2,
            num_segments=len(segments),
            segments=segments,
            original_prompt=user_prompt,
        )

    def _estimate_panels(self, prompt: str) -> int:
        """
        Estimate number of comic panels needed using OpenAI.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert manga/comic artist. Estimate how many comic panels 
would be needed to properly visualize the given story prompt.

Consider:
- Each distinct action/moment = 1 panel
- Dialogue exchanges: 1-2 panels per back-and-forth
- Dramatic reveals deserve their own panel
- Scene establishing shots = 1 panel
- Reaction shots are important in manga

Respond with ONLY a JSON object: {"panel_count": <number>, "reasoning": "<brief explanation>"}"""
                    },
                    {
                        "role": "user", 
                        "content": f"Estimate the number of panels for this prompt:\n\n{prompt}"
                    },
                ],
                temperature=0.3,
                max_tokens=200,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content or "{}")
            panels = int(result.get("panel_count", 4))
            logger.info("Panel estimation", panels=panels, reasoning=result.get("reasoning", ""))
            return panels

        except Exception as e:
            logger.warning("Panel estimation failed, using fallback", error=str(e))
            words = len(prompt.split())
            return max(3, min(20, words // 20 + 1))

    def _split_script(
        self,
        user_prompt: str,
        total_panels: int,
        scene_context: dict[str, Any] | None,
        scene_bible: dict[str, Any] | None,
    ) -> list[ScriptSegment]:
        """
        Split a script into multiple comic pages using AI.
        """
        # Calculate number of pages but cap at MAX_SEGMENTS
        num_pages = min(self.MAX_SEGMENTS, max(2, (total_panels + self.TARGET_PANELS_PER_PAGE - 1) // self.TARGET_PANELS_PER_PAGE))
        
        logger.info("Splitting script", total_panels=total_panels, num_pages=num_pages)

        context_str = ""
        if scene_context:
            context_str = f"\nScene Context: {json.dumps(scene_context)}"
        
        bible_str = ""
        if scene_bible:
            # Extract key info from bible
            characters = scene_bible.get("characters", {})
            if characters:
                char_names = [c.get("name", k) for k, c in characters.items()]
                bible_str = f"\nCharacters: {', '.join(char_names)}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an expert manga/comic editor. Split the given story into {num_pages} distinct comic pages.

Each page should:
- Contain 3-6 panels worth of content
- Have a clear narrative arc within the page
- End at a natural break point (dramatic moment, scene change, cliffhanger)
- Maintain character and setting consistency across pages
- Include continuity notes for smooth transitions

Respond with ONLY a JSON object:
{{
    "segments": [
        {{
            "order_index": 1,
            "prompt": "Detailed prompt for this page only",
            "scene_description": "Brief setting/context for this page",
            "num_panels_estimate": 4,
            "continuity_notes": "How this connects to next page / what to maintain"
        }},
        ...
    ]
}}"""
                    },
                    {
                        "role": "user",
                        "content": f"Split this story into {num_pages} comic pages:{context_str}{bible_str}\n\nStory:\n{user_prompt}"
                    },
                ],
                temperature=0.7,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )

            result = json.loads(response.choices[0].message.content or "{}")
            segments_data = result.get("segments", [])
            
            segments = []
            for i, seg in enumerate(segments_data):
                segments.append(ScriptSegment(
                    order_index=seg.get("order_index", i + 1),
                    prompt=seg.get("prompt", ""),
                    scene_description=seg.get("scene_description", ""),
                    num_panels_estimate=int(seg.get("num_panels_estimate", self.TARGET_PANELS_PER_PAGE)),
                    continuity_notes=seg.get("continuity_notes", ""),
                ))
            
            logger.info("Script split successfully", num_pages=len(segments))
            return segments

        except Exception as e:
            logger.error("Script splitting failed", error=str(e))
            # Fallback: simple split by sentences
            return self._fallback_split(user_prompt, num_pages)

    def _fallback_split(self, prompt: str, num_pages: int) -> list[ScriptSegment]:
        """
        Fallback splitting when AI fails - split by sentences.
        """
        import re
        sentences = re.split(r'(?<=[.!?])\s+', prompt)
        
        # Distribute sentences across pages
        sentences_per_page = max(1, len(sentences) // num_pages)
        
        segments = []
        for i in range(num_pages):
            start = i * sentences_per_page
            end = start + sentences_per_page if i < num_pages - 1 else len(sentences)
            segment_text = ' '.join(sentences[start:end])
            
            if segment_text.strip():
                segments.append(ScriptSegment(
                    order_index=i + 1,
                    prompt=segment_text,
                    scene_description="",
                    num_panels_estimate=self.TARGET_PANELS_PER_PAGE,
                    continuity_notes="Continue from previous page.",
                ))
        
        return segments if segments else [ScriptSegment(
            order_index=1,
            prompt=prompt,
            scene_description="",
            num_panels_estimate=4,
            continuity_notes="",
        )]

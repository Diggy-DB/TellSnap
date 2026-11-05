"""
HTTP API for the comic generation service.

Provides endpoints for script analysis and segmentation that the
NestJS backend can call before creating comic pages.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any
import uvicorn
import structlog

from src.services.script_segmenter import ScriptSegmenter, SegmentationResult
from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

app = FastAPI(
    title="StoryForge Generator API",
    description="Script analysis and comic/manga generation service",
    version="2.0.0",
)


class AnalyzeScriptRequest(BaseModel):
    """Request to analyze a script for segmentation."""
    prompt: str
    scene_context: dict[str, Any] | None = None
    scene_bible: dict[str, Any] | None = None


class SegmentResponse(BaseModel):
    """A single segment/page from segmentation."""
    order_index: int
    prompt: str
    scene_description: str
    duration_estimate: float  # Kept for compatibility, represents panels * 2
    continuity_notes: str


class AnalyzeScriptResponse(BaseModel):
    """Response from script analysis."""
    needs_segmentation: bool
    total_duration_estimate: float  # Kept for compatibility
    num_segments: int  # Number of comic pages
    segments: list[SegmentResponse]


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "generator"}


@app.post("/api/analyze-script", response_model=AnalyzeScriptResponse)
async def analyze_script(request: AnalyzeScriptRequest):
    """
    Analyze a script and determine if it needs to be split into multiple comic pages.
    
    The NestJS backend should call this endpoint before creating segments
    to determine how many comic pages to generate.
    """
    try:
        logger.info("Analyzing script for comic generation", prompt_length=len(request.prompt))
        
        segmenter = ScriptSegmenter()
        result = segmenter.analyze_and_segment(
            user_prompt=request.prompt,
            scene_context=request.scene_context,
            scene_bible=request.scene_bible,
        )
        
        segments = [
            SegmentResponse(
                order_index=seg.order_index,
                prompt=seg.prompt,
                scene_description=seg.scene_description,
                # Convert panels to duration_estimate for API compatibility (panels * 2)
                duration_estimate=seg.num_panels_estimate * 2.0,
                continuity_notes=seg.continuity_notes,
            )
            for seg in result.segments
        ]
        
        return AnalyzeScriptResponse(
            needs_segmentation=result.needs_segmentation,
            total_duration_estimate=result.total_duration_estimate,
            num_segments=len(segments),
            segments=segments,
        )
        
    except Exception as e:
        logger.error("Script analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


def start_api_server():
    """Start the FastAPI server."""
    logger.info("Starting Generator API server", port=settings.api_port if hasattr(settings, 'api_port') else 8080)
    uvicorn.run(app, host="0.0.0.0", port=getattr(settings, 'api_port', 8080))


if __name__ == "__main__":
    start_api_server()

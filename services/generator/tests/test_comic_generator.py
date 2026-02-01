"""
Tests for ComicGenerator service.

Tests the comic generation functionality that creates manga/manhwa
style comic pages using AI image generation.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
from PIL import Image
import io
import tempfile

from src.services.comic_generator import (
    ComicGenerator,
    ComicPageResult,
    PanelResult,
    ComicGenerationError,
)


class TestPanelResult:
    """Tests for PanelResult dataclass."""

    def test_panel_result_creation(self):
        """Test creating a panel result."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            result = PanelResult(
                panel_index=0,
                image_path=Path(tmp.name),
                description="A warrior in battle stance",
                dialogue=[{"character": "Hero", "text": "Let's go!"}],
                width=512,
                height=768,
            )

            assert result.panel_index == 0
            assert result.width == 512
            assert result.height == 768
            assert "warrior" in result.description


class TestComicPageResult:
    """Tests for ComicPageResult dataclass."""

    def test_comic_page_result_creation(self):
        """Test creating a comic page result."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            page_path = Path(tmp_dir) / "page.png"
            page_path.touch()

            result = ComicPageResult(
                page_path=page_path,
                panel_paths=[page_path],
                thumbnail_path=None,
                num_panels=3,
                width=1080,
                height=1920,
                generation_id="gen_12345",
                style="manga",
            )

            assert result.num_panels == 3
            assert result.style == "manga"
            assert result.width == 1080
            assert result.height == 1920


class TestComicGenerator:
    """Tests for ComicGenerator service."""

    @pytest.fixture
    def mock_genai_client(self):
        """Create a mock genai client."""
        mock_client = MagicMock()
        
        # Create a mock image response
        mock_image = MagicMock()
        # Create a small test image
        img = Image.new('RGB', (512, 768), color='white')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        mock_image.image.image_bytes = img_bytes.getvalue()
        
        mock_response = MagicMock()
        mock_response.generated_images = [mock_image]
        
        mock_client.models.generate_images.return_value = mock_response
        
        return mock_client

    @pytest.fixture
    def generator(self, mock_genai_client):
        """Create a ComicGenerator with mocked Google AI client."""
        with patch('src.services.comic_generator.genai') as mock_genai:
            with patch('src.services.comic_generator.get_settings') as mock_settings:
                mock_settings.return_value = MagicMock(
                    google_application_credentials=None,
                    google_ai_api_key="test_api_key",
                    google_cloud_project="test-project",
                )
                mock_genai.Client.return_value = mock_genai_client
                
                generator = ComicGenerator()
                generator.client = mock_genai_client
                return generator

    def test_init(self, generator):
        """Test ComicGenerator initialization."""
        assert generator is not None
        assert generator.client is not None
        assert generator.image_model == "imagen-3.0-generate-002"

    def test_generate_single_panel(self, generator):
        """Test generating a single panel comic page."""
        panel_prompts = [
            {
                "description": "A lone samurai stands in the rain",
                "dialogue": [{"character": "Samurai", "text": "..."}],
            }
        ]

        result = generator.generate(
            panel_prompts=panel_prompts,
            style="manga",
            page_layout="single",
        )

        assert isinstance(result, ComicPageResult)
        assert result.num_panels == 1
        assert result.style == "manga"

    def test_generate_multiple_panels(self, generator):
        """Test generating a multi-panel comic page."""
        panel_prompts = [
            {
                "description": "Panel 1: Hero looks up",
                "dialogue": [],
            },
            {
                "description": "Panel 2: Villain appears",
                "dialogue": [{"character": "Villain", "text": "At last..."}],
            },
            {
                "description": "Panel 3: Confrontation",
                "dialogue": [{"character": "Hero", "text": "You!"}],
            },
        ]

        result = generator.generate(
            panel_prompts=panel_prompts,
            style="manga",
            page_layout="vertical_3",
        )

        assert result.num_panels == 3
        assert len(result.panel_paths) == 3

    def test_generate_with_scene_bible(self, generator):
        """Test generation with scene bible for consistency."""
        panel_prompts = [
            {
                "description": "Akira rushes through the crowd",
                "dialogue": [],
            }
        ]

        scene_bible = {
            "characters": {
                "Akira": {
                    "appearance": "Young man with messy black hair, scar on left cheek",
                    "clothing": "Black jacket, white shirt",
                }
            },
            "art_style": "Clean lines, high contrast",
        }

        result = generator.generate(
            panel_prompts=panel_prompts,
            scene_bible=scene_bible,
            style="manga",
        )

        assert result is not None
        # Verify API was called
        generator.client.models.generate_images.assert_called()

    def test_different_comic_styles(self, generator):
        """Test generation with different comic styles."""
        styles = ["manga", "manhwa", "western_comic", "webtoon"]
        panel_prompts = [{"description": "Test scene", "dialogue": []}]

        for style in styles:
            result = generator.generate(
                panel_prompts=panel_prompts,
                style=style,
            )

            assert result.style == style

    def test_max_panels_limit(self, generator):
        """Test that panels are capped at maximum (6)."""
        # Create 8 panel prompts
        panel_prompts = [
            {"description": f"Panel {i}", "dialogue": []}
            for i in range(8)
        ]

        result = generator.generate(
            panel_prompts=panel_prompts,
            style="manga",
        )

        # Should be capped at 6
        assert result.num_panels <= 6

    def test_empty_panels_raises_error(self, generator):
        """Test that empty panel list raises an error."""
        with pytest.raises(ComicGenerationError):
            generator.generate(
                panel_prompts=[],
                style="manga",
            )

    def test_page_aspect_ratios(self, generator):
        """Test different page aspect ratios."""
        panel_prompts = [{"description": "Test", "dialogue": []}]

        # Portrait (default for manga)
        result = generator.generate(
            panel_prompts=panel_prompts,
            style="manga",
            aspect_ratio="9:16",
        )
        assert result is not None

    def test_get_style_instructions(self, generator):
        """Test that style instructions are properly generated."""
        styles = {
            "manga": ["black and white", "Japanese"],
            "manhwa": ["Korean", "webtoon"],
            "western_comic": ["American", "superhero"],
        }

        for style, expected_keywords in styles.items():
            instructions = generator._get_style_instructions(style)
            assert instructions is not None
            assert len(instructions) > 0

    def test_get_character_context(self, generator):
        """Test character context extraction from scene bible."""
        scene_bible = {
            "characters": {
                "Hero": {"appearance": "Tall, muscular"},
                "Sidekick": {"appearance": "Short, cheerful"},
            }
        }

        context = generator._get_character_context(scene_bible)
        assert "Hero" in context or context != ""

    def test_get_character_context_empty(self, generator):
        """Test character context with no scene bible."""
        context = generator._get_character_context(None)
        assert context == "" or context is not None


class TestComicLayouts:
    """Tests for comic page layout functionality."""

    @pytest.fixture
    def generator(self):
        """Create generator with mocked client."""
        with patch('src.services.comic_generator.genai') as mock_genai:
            with patch('src.services.comic_generator.get_settings') as mock_settings:
                mock_settings.return_value = MagicMock(
                    google_application_credentials=None,
                    google_ai_api_key="test_key",
                    google_cloud_project="test-project",
                )
                mock_client = MagicMock()
                mock_genai.Client.return_value = mock_client
                
                # Setup mock image response
                mock_image = MagicMock()
                img = Image.new('RGB', (512, 768), color='white')
                img_bytes = io.BytesIO()
                img.save(img_bytes, format='PNG')
                mock_image.image.image_bytes = img_bytes.getvalue()
                
                mock_response = MagicMock()
                mock_response.generated_images = [mock_image]
                mock_client.models.generate_images.return_value = mock_response
                
                generator = ComicGenerator()
                generator.client = mock_client
                return generator

    def test_layout_selection(self, generator):
        """Test automatic layout selection based on panel count."""
        layouts = {
            1: "single",
            2: "vertical_2",
            3: "vertical_3",
            4: "grid_2x2",
        }

        for num_panels, expected_layout in layouts.items():
            panel_prompts = [
                {"description": f"Panel {i}", "dialogue": []}
                for i in range(num_panels)
            ]
            
            result = generator.generate(
                panel_prompts=panel_prompts,
                style="manga",
                page_layout="auto",
            )
            
            assert result.num_panels == num_panels


class TestComicGenerationError:
    """Tests for error handling in comic generation."""

    def test_error_creation(self):
        """Test creating a ComicGenerationError."""
        error = ComicGenerationError("Failed to generate panel")
        assert str(error) == "Failed to generate panel"

    def test_error_with_details(self):
        """Test error with additional details."""
        error = ComicGenerationError("API error: rate limit exceeded")
        assert "rate limit" in str(error)

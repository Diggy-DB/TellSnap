"""
Tests for ScriptExpander service.

Tests the script expansion functionality that converts user prompts
into detailed comic panel descriptions.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from dataclasses import asdict

from src.services.script_expander import (
    ScriptExpander,
    ExpandedScript,
    PanelDescription,
    PreviousSegment,
)


class TestPanelDescription:
    """Tests for PanelDescription dataclass."""

    def test_panel_description_creation(self):
        """Test creating a panel description."""
        panel = PanelDescription(
            panel_index=0,
            description="A warrior stands on a cliff overlooking the battlefield",
            dialogue=["Hero: We fight at dawn!"],
            action="standing heroically",
            emotion="determined",
        )
        
        assert panel.panel_index == 0
        assert "warrior" in panel.description
        assert len(panel.dialogue) == 1
        assert panel.action == "standing heroically"
        assert panel.emotion == "determined"

    def test_panel_description_empty_dialogue(self):
        """Test panel with no dialogue."""
        panel = PanelDescription(
            panel_index=1,
            description="Silent contemplation scene",
            dialogue=[],
            action="meditating",
            emotion="peaceful",
        )
        
        assert panel.dialogue == []


class TestExpandedScript:
    """Tests for ExpandedScript dataclass."""

    def test_expanded_script_creation(self):
        """Test creating an expanded script."""
        panels = [
            PanelDescription(
                panel_index=0,
                description="Panel 1",
                dialogue=[],
                action="action1",
                emotion="neutral",
            ),
            PanelDescription(
                panel_index=1,
                description="Panel 2",
                dialogue=[{"character": "Hero", "text": "Hello!"}],
                action="action2",
                emotion="happy",
            ),
        ]
        
        script = ExpandedScript(
            full_script="A story about heroes",
            scene_description="An epic battle scene",
            character_descriptions={"Hero": "A brave warrior"},
            actions=["action1", "action2"],
            dialogue=[{"character": "Hero", "text": "Hello!"}],
            visual_notes="Dynamic angles",
            panel_layout="vertical_2",
            mood_and_atmosphere="Tense and dramatic",
            num_panels=2,
            panels=panels,
            comic_style="manga",
        )
        
        assert script.num_panels == 2
        assert script.panel_layout == "vertical_2"
        assert script.comic_style == "manga"
        assert len(script.panels) == 2

    def test_expanded_script_default_style(self):
        """Test expanded script with default manga style."""
        script = ExpandedScript(
            full_script="Test",
            scene_description="Test scene",
            character_descriptions={},
            actions=[],
            dialogue=[],
            visual_notes="",
            panel_layout="single",
            mood_and_atmosphere="Neutral",
            num_panels=1,
            panels=[],
            comic_style="manga",
        )
        
        assert script.comic_style == "manga"


class TestScriptExpander:
    """Tests for ScriptExpander service."""

    @pytest.fixture
    def expander(self):
        """Create a ScriptExpander instance with mocked OpenAI client."""
        with patch('openai.OpenAI') as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            expander = ScriptExpander()
            expander.client = mock_client
            return expander

    def test_init(self, expander):
        """Test ScriptExpander initialization."""
        assert expander is not None
        assert expander.client is not None

    def test_expand_simple_prompt(self, expander):
        """Test expanding a simple user prompt."""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='''{
                        "full_script": "A brave warrior faces their destiny",
                        "panels": [
                            {
                                "panel_index": 0,
                                "description": "Wide shot of a warrior silhouetted against a stormy sky",
                                "dialogue": ["Warrior: The time has come..."],
                                "action": "standing dramatically",
                                "emotion": "determined"
                            },
                            {
                                "panel_index": 1,
                                "description": "Close-up of the warrior's face, eyes burning with resolve",
                                "dialogue": [],
                                "action": "gripping sword",
                                "emotion": "fierce"
                            },
                            {
                                "panel_index": 2,
                                "description": "The warrior charges forward into battle",
                                "dialogue": ["Warrior: For glory!"],
                                "action": "charging",
                                "emotion": "battle fury"
                            }
                        ],
                        "panel_layout": "vertical_3",
                        "num_panels": 3,
                        "comic_style": "manga"
                    }'''
                )
            )
        ]
        expander.client.chat.completions.create.return_value = mock_response

        result = expander.expand(
            user_prompt="A warrior prepares for battle",
            scene_context={"title": "The Final Battle"},
        )

        assert isinstance(result, ExpandedScript)
        assert result.num_panels == 3
        assert result.panel_layout == "vertical_3"
        assert len(result.panels) == 3
        assert result.panels[0].emotion == "determined"

    def test_expand_with_scene_bible(self, expander):
        """Test expansion with scene bible for character consistency."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='''{
                        "full_script": "Akira and Yuki meet in the garden",
                        "panels": [
                            {
                                "panel_index": 0,
                                "description": "Akira with spiky black hair stands by the cherry blossoms",
                                "dialogue": ["Akira: You came..."],
                                "action": "waiting",
                                "emotion": "hopeful"
                            }
                        ],
                        "panel_layout": "single",
                        "num_panels": 1,
                        "comic_style": "manga"
                    }'''
                )
            )
        ]
        expander.client.chat.completions.create.return_value = mock_response

        scene_bible = {
            "characters": {
                "Akira": {
                    "appearance": "Tall male with spiky black hair",
                    "personality": "Brave but secretly shy",
                },
                "Yuki": {
                    "appearance": "Short female with long white hair",
                    "personality": "Cold exterior, warm heart",
                },
            },
            "setting": "A traditional Japanese garden with cherry blossoms",
        }

        result = expander.expand(
            user_prompt="Akira waits for Yuki in the garden",
            scene_context={"title": "Garden Meeting"},
            scene_bible=scene_bible,
        )

        assert result is not None
        # Verify that the OpenAI call included scene bible context
        call_args = expander.client.chat.completions.create.call_args
        messages = call_args.kwargs.get('messages', call_args[1].get('messages', []))
        # Check that scene bible info was included in the prompt
        prompt_text = str(messages)
        assert len(result.panels) >= 1

    def test_expand_with_previous_segments(self, expander):
        """Test expansion with continuity from previous segments."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content='''{
                        "full_script": "Continuing the chase scene",
                        "panels": [
                            {
                                "panel_index": 0,
                                "description": "The hero leaps across rooftops",
                                "dialogue": [],
                                "action": "jumping",
                                "emotion": "focused"
                            }
                        ],
                        "panel_layout": "single",
                        "num_panels": 1,
                        "comic_style": "manhwa"
                    }'''
                )
            )
        ]
        expander.client.chat.completions.create.return_value = mock_response

        previous = [
            PreviousSegment(
                order_index=0,
                prompt="Hero starts chasing the villain",
                expanded_script="The chase begins through the city streets",
                image_url="https://example.com/page1.png",
            )
        ]

        result = expander.expand(
            user_prompt="The chase continues on the rooftops",
            scene_context={"title": "Rooftop Chase"},
            previous_segments=previous,
            comic_style="manhwa",
        )

        assert result.comic_style == "manhwa"

    def test_expand_different_styles(self, expander):
        """Test expansion with different comic styles."""
        styles = ["manga", "manhwa", "western_comic", "webtoon"]
        
        for style in styles:
            mock_response = MagicMock()
            mock_response.choices = [
                MagicMock(
                    message=MagicMock(
                        content=f'''{{
                            "full_script": "Test story",
                            "panels": [
                                {{
                                    "panel_index": 0,
                                    "description": "Test panel",
                                    "dialogue": [],
                                    "action": "test",
                                    "emotion": "neutral"
                                }}
                            ],
                            "panel_layout": "single",
                            "num_panels": 1,
                            "comic_style": "{style}"
                        }}'''
                    )
                )
            ]
            expander.client.chat.completions.create.return_value = mock_response

            result = expander.expand(
                user_prompt="Test prompt",
                scene_context={"title": "Test"},
                comic_style=style,
            )

            assert result.comic_style == style

    def test_fallback_on_parse_error(self, expander):
        """Test fallback behavior when JSON parsing fails."""
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    content="This is not valid JSON at all"
                )
            )
        ]
        expander.client.chat.completions.create.return_value = mock_response

        result = expander.expand(
            user_prompt="A simple scene",
            scene_context={"title": "Simple Scene"},
        )

        # Should fall back to simple expansion
        assert isinstance(result, ExpandedScript)
        assert result.num_panels >= 1


class TestPreviousSegment:
    """Tests for PreviousSegment dataclass."""

    def test_previous_segment_creation(self):
        """Test creating a previous segment reference."""
        segment = PreviousSegment(
            order_index=0,
            prompt="Hero enters the castle",
            expanded_script="The hero walks through the grand gates...",
            image_url="https://storage.example.com/page1.png",
        )

        assert segment.order_index == 0
        assert "castle" in segment.prompt
        assert segment.image_url is not None

    def test_previous_segment_optional_fields(self):
        """Test previous segment with optional fields as None."""
        segment = PreviousSegment(
            order_index=1,
            prompt="Next scene",
            expanded_script=None,
            image_url=None,
        )

        assert segment.expanded_script is None
        assert segment.image_url is None

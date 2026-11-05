"""
Tests that the generator reads Firestore data in the format the NestJS API writes.

The API stores camelCase fields (sceneId, orderIndex, topicId) and keeps Scene
Bibles in the "sceneBibles" collection with list-shaped characters/locations.
"""

from unittest.mock import MagicMock, patch

from src.services.firestore_db import FirestoreService
from src.services.script_expander import ScriptExpander


def _doc(data, doc_id):
    doc = MagicMock()
    doc.exists = True
    doc.id = doc_id
    doc.to_dict.return_value = dict(data)
    return doc


def _service_with(collections):
    """Build a FirestoreService whose collections return the given documents."""
    service = FirestoreService.__new__(FirestoreService)
    service.redis = MagicMock()
    service.db = MagicMock()

    cache = {}

    def collection(name):
        if name not in cache:
            col = MagicMock()
            docs = collections.get(name, [])
            col.where.return_value.stream.return_value = docs
            col.where.return_value.limit.return_value.stream.return_value = docs[:1]
            cache[name] = col
        return cache[name]

    service.db.collection.side_effect = collection
    return service


class TestFirestoreFieldNames:
    def test_previous_segments_use_api_fields_and_are_sorted(self):
        segments = [
            _doc({"sceneId": "s1", "orderIndex": 3, "prompt": "third"}, "c"),
            _doc({"sceneId": "s1", "orderIndex": 1, "prompt": "first"}, "a"),
            _doc({"sceneId": "s1", "orderIndex": 2, "prompt": "second"}, "b"),
        ]
        service = _service_with({"segments": segments})

        earlier = service.get_segments_before("s1", 3)

        assert [s["prompt"] for s in earlier] == ["first", "second"]
        service.db.collection("segments").where.assert_called_with("sceneId", "==", "s1")

    def test_scene_bible_is_read_from_api_collection(self):
        bible = _doc({"sceneId": "s1", "characters": [{"name": "Mira"}]}, "bible-1")
        service = _service_with({"sceneBibles": [bible]})

        result = service.get_scene_bible("s1")

        assert result["characters"][0]["name"] == "Mira"
        service.db.collection.assert_any_call("sceneBibles")


class TestScriptExpanderCompatibility:
    def test_system_prompt_accepts_api_shaped_scene_bible(self):
        expander = ScriptExpander.__new__(ScriptExpander)
        bible = {
            "characters": [{"entityId": "c1", "name": "Mira", "physicalDescription": {"hair": "silver"}}],
            "locations": [{"entityId": "l1", "name": "Old Port", "description": "foggy docks"}],
            "rules": [{"rule": "No magic in daylight"}],
        }

        prompt = expander._build_system_prompt(bible, "manga")

        assert "Mira" in prompt
        assert "Old Port" in prompt
        assert "No magic in daylight" in prompt

    def test_empty_scene_bible_adds_no_section(self):
        expander = ScriptExpander.__new__(ScriptExpander)
        empty = {"characters": [], "locations": [], "rules": [], "objects": [], "timeline": []}

        assert "Scene Bible" not in expander._build_system_prompt(empty, "manga")

    def test_expand_without_openai_key_uses_fallback(self):
        with patch("src.services.script_expander.settings") as settings:
            settings.openai_api_key = ""
            settings.openai_model = "gpt-4"
            expander = ScriptExpander()

        result = expander.expand(user_prompt="A knight finds a dragon egg.", scene_context={"title": "Egg"})

        assert expander.client is None
        assert len(result.panels) > 0

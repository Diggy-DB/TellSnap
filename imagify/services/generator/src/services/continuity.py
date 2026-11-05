"""
Continuity Validator - Ensures consistency with Scene Bible.
"""

from dataclasses import dataclass, field
import re
import structlog

logger = structlog.get_logger()


@dataclass
class Violation:
    """A continuity violation."""
    type: str  # error, warning
    category: str  # character, location, timeline, object
    message: str
    entity_id: str | None = None
    suggestion: str | None = None


@dataclass
class AutoCorrection:
    """An automatic correction."""
    field: str
    original: str
    corrected: str
    reason: str


@dataclass
class ValidationResult:
    """Result of continuity validation."""
    is_valid: bool
    violations: list[Violation] = field(default_factory=list)
    auto_corrections: list[AutoCorrection] = field(default_factory=list)


class ContinuityValidator:
    """Validates scripts against Scene Bible for continuity."""

    def validate(self, script: str, bible: dict | None) -> ValidationResult:
        """
        Validate a script against the Scene Bible.
        
        Args:
            script: The expanded script to validate
            bible: The Scene Bible dictionary
            
        Returns:
            ValidationResult with any violations found
        """
        if not bible:
            return ValidationResult(is_valid=True)

        violations = []
        auto_corrections = []

        # Check character continuity
        char_violations, char_corrections = self._check_characters(script, bible)
        violations.extend(char_violations)
        auto_corrections.extend(char_corrections)

        # Check location continuity
        loc_violations = self._check_locations(script, bible)
        violations.extend(loc_violations)

        # Check timeline continuity
        timeline_violations = self._check_timeline(script, bible)
        violations.extend(timeline_violations)

        # Check object continuity
        obj_violations = self._check_objects(script, bible)
        violations.extend(obj_violations)

        # Determine if valid (no errors, warnings are ok)
        errors = [v for v in violations if v.type == "error"]
        is_valid = len(errors) == 0

        return ValidationResult(
            is_valid=is_valid,
            violations=violations,
            auto_corrections=auto_corrections,
        )

    def apply_corrections(
        self,
        script: str,
        corrections: list[AutoCorrection],
    ) -> str:
        """Apply automatic corrections to a script."""
        corrected = script
        for correction in corrections:
            corrected = corrected.replace(correction.original, correction.corrected)
        return corrected

    def extract_bible_updates(self, script: str) -> dict | None:
        """Extract new characters, locations, etc. from script to add to Bible."""
        # This would use NLP/LLM to extract entities
        # Simplified implementation
        updates = {}
        
        # Look for new character introductions
        new_chars = self._extract_new_characters(script)
        if new_chars:
            updates["characters"] = new_chars

        # Look for new locations
        new_locs = self._extract_new_locations(script)
        if new_locs:
            updates["locations"] = new_locs

        return updates if updates else None

    def _check_characters(
        self,
        script: str,
        bible: dict,
    ) -> tuple[list[Violation], list[AutoCorrection]]:
        """Check character consistency."""
        violations = []
        corrections = []
        characters = bible.get("characters", {})

        for entity_id, char in characters.items():
            name = char.get("name", "")
            
            # Check if character is mentioned
            if name.lower() in script.lower():
                # Check for description consistency
                physical = char.get("physicalDescription", {})
                
                # Check hair color
                hair_color = physical.get("hairColor", "")
                if hair_color:
                    wrong_colors = self._find_wrong_attribute(
                        script, name, "hair", hair_color, ["blonde", "brunette", "red", "black", "gray", "white"]
                    )
                    if wrong_colors:
                        violations.append(Violation(
                            type="error",
                            category="character",
                            message=f"{name}'s hair is {hair_color}, but script mentions {wrong_colors}",
                            entity_id=entity_id,
                            suggestion=f"Change to {hair_color}",
                        ))
                        corrections.append(AutoCorrection(
                            field="hair_color",
                            original=wrong_colors,
                            corrected=hair_color,
                            reason=f"Maintaining character consistency for {name}",
                        ))

                # Check status (alive/deceased)
                status = char.get("status", "alive")
                if status == "deceased" and self._character_acts_alive(script, name):
                    violations.append(Violation(
                        type="error",
                        category="character",
                        message=f"{name} is deceased but appears active in the script",
                        entity_id=entity_id,
                    ))

        return violations, corrections

    def _check_locations(self, script: str, bible: dict) -> list[Violation]:
        """Check location consistency."""
        violations = []
        locations = bible.get("locations", {})

        for entity_id, loc in locations.items():
            name = loc.get("name", "")
            if name.lower() in script.lower():
                # Check for feature consistency
                features = loc.get("features", [])
                # Could check if contradictory features are mentioned
                pass

        return violations

    def _check_timeline(self, script: str, bible: dict) -> list[Violation]:
        """Check timeline consistency."""
        violations = []
        timeline = bible.get("timeline", [])

        if not timeline:
            return violations

        # Check for references to events that should have happened
        # or events that contradict established timeline
        
        return violations

    def _check_objects(self, script: str, bible: dict) -> list[Violation]:
        """Check object consistency."""
        violations = []
        objects = bible.get("objects", {})

        for entity_id, obj in objects.items():
            name = obj.get("name", "")
            if name.lower() in script.lower():
                # Check current owner/location
                current_owner = obj.get("currentOwner")
                if current_owner:
                    # Could check if object is used by wrong character
                    pass

        return violations

    def _find_wrong_attribute(
        self,
        script: str,
        character_name: str,
        attribute_type: str,
        correct_value: str,
        possible_values: list[str],
    ) -> str | None:
        """Find incorrect attribute mentions near character name."""
        script_lower = script.lower()
        char_lower = character_name.lower()

        # Look for character name
        char_pos = script_lower.find(char_lower)
        if char_pos == -1:
            return None

        # Check surrounding context (100 chars before and after)
        context_start = max(0, char_pos - 100)
        context_end = min(len(script), char_pos + len(character_name) + 100)
        context = script_lower[context_start:context_end]

        # Look for wrong values
        for value in possible_values:
            if value.lower() != correct_value.lower() and value.lower() in context:
                if attribute_type in context:
                    return value

        return None

    def _character_acts_alive(self, script: str, character_name: str) -> bool:
        """Check if a character performs living actions in script."""
        action_words = ["walks", "says", "runs", "speaks", "moves", "looks", "goes"]
        script_lower = script.lower()
        char_lower = character_name.lower()

        for action in action_words:
            pattern = f"{char_lower}\\s+{action}"
            if re.search(pattern, script_lower):
                return True

        return False

    def _extract_new_characters(self, script: str) -> dict:
        """Extract new characters from script."""
        # Simplified - would use NLP in production
        return {}

    def _extract_new_locations(self, script: str) -> dict:
        """Extract new locations from script."""
        # Simplified - would use NLP in production
        return {}

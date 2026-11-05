# 05 - Continuity System

> Scene Bible design, continuity validation, memory strategy, and fork/rebase handling.

---

## 1. Overview

The Continuity System ensures that characters, settings, and story elements remain consistent across all segments in a scene. This is critical to prevent "character drift" where names change, personalities contradict, or timeline errors occur.

### Core Components
1. **Scene Bible** - Canonical structured JSON persisted per scene
2. **Character Entity IDs** - Stable identifiers that prevent name drift
3. **Continuity Validator** - Gate before video generation
4. **Memory Strategy** - Context window management for LLM
5. **Reference Assets** - Optional visual/audio anchors
6. **Versioning/Locking** - Handle concurrent edits

---

## 2. Scene Bible

### 2.1 Purpose
The Scene Bible is the single source of truth for all continuity-critical information in a scene. It is:
- Created when a scene is initialized
- Updated after each successful segment
- Versioned for optimistic locking
- Used as mandatory context for script expansion and validation

### 2.2 Complete Schema

```typescript
interface SceneBible {
  // Versioning
  version: number;
  sceneId: string;
  updatedAt: string;
  updatedBySegmentId: string | null;
  
  // Characters
  characters: Character[];
  
  // World/Setting
  setting: Setting;
  
  // Story Timeline
  timeline: Timeline;
  
  // Active Plot Threads
  plotThreads: PlotThread[];
  
  // Style Consistency
  styleGuide: StyleGuide;
  
  // Facts/Rules established in story
  establishedFacts: EstablishedFact[];
}

interface Character {
  // Immutable identifier (e.g., "char_maya_001")
  entityId: string;
  
  // The official name used in the story
  canonicalName: string;
  
  // All acceptable alternative names
  aliases: string[];
  
  // Forbidden names (to prevent confusion)
  forbiddenNames: string[];
  
  // Physical and personality description
  description: string;
  
  // Core personality traits
  traits: string[];
  
  // Background/history
  backstory: string | null;
  
  // Current state
  currentState: {
    location: string | null;
    emotionalState: string | null;
    physicalCondition: string | null;
  };
  
  // Relationships to other characters
  relationships: Relationship[];
  
  // Reference assets for visual/audio consistency
  referenceAssets: {
    portraitUrl: string | null;
    voiceAnchorUrl: string | null;
    styleFrameUrl: string | null;
  };
  
  // Tracking
  introducedInSegment: number;
  lastAppearedInSegment: number;
  isActive: boolean;  // false if character left/died
  isProtagonist: boolean;
}

interface Relationship {
  targetEntityId: string;
  type: string;  // "sibling", "enemy", "mentor", etc.
  description: string | null;
  establishedInSegment: number;
}

interface Setting {
  // Primary location/world
  primaryWorld: string;
  
  // Time period/era
  timePeriod: string;
  
  // Fundamental rules of the world
  worldRules: WorldRule[];
  
  // Named locations
  locations: Location[];
  
  // Technology level / magic system
  technologyLevel: string | null;
  magicSystem: string | null;
}

interface WorldRule {
  rule: string;
  establishedInSegment: number;
  exceptions: string[];
}

interface Location {
  name: string;
  description: string;
  connectedTo: string[];  // other location names
  introducedInSegment: number;
}

interface Timeline {
  // Current point in story time
  currentPoint: string;
  
  // How time has passed
  timeProgression: {
    segmentNumber: number;
    timeElapsed: string;  // "2 hours later", "next morning"
  }[];
  
  // Major plot events
  majorEvents: TimelineEvent[];
}

interface TimelineEvent {
  segmentNumber: number;
  timestamp: string | null;  // in-story time
  event: string;
  consequences: string[];
  charactersInvolved: string[];  // entity IDs
}

interface PlotThread {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'abandoned';
  introducedInSegment: number;
  resolvedInSegment: number | null;
  characters: string[];  // entity IDs involved
}

interface StyleGuide {
  // Overall tone
  tone: string;  // "dark", "comedic", "tense"
  
  // Genre(s)
  genres: string[];
  
  // Visual style for video generation
  visualStyle: string;
  
  // Narrative perspective
  narrativePOV: 'first' | 'third-limited' | 'third-omniscient';
  povCharacter: string | null;  // entity ID if limited POV
  
  // Pacing preferences
  pacing: 'slow' | 'medium' | 'fast';
  
  // Content guidelines
  contentRating: 'G' | 'PG' | 'PG-13' | 'R';
  avoidThemes: string[];
}

interface EstablishedFact {
  fact: string;
  category: 'character' | 'world' | 'plot' | 'rule';
  establishedInSegment: number;
  canBeContradicted: boolean;
}
```

### 2.3 Example Scene Bible

```json
{
  "version": 5,
  "sceneId": "scn_abc123",
  "updatedAt": "2026-01-31T08:00:00Z",
  "updatedBySegmentId": "seg_005",
  
  "characters": [
    {
      "entityId": "char_maya_001",
      "canonicalName": "Maya Chen",
      "aliases": ["Captain Chen", "Maya", "Captain"],
      "forbiddenNames": ["Captain Williams", "Sarah Chen"],
      "description": "45-year-old starship captain with silver-streaked black hair, sharp brown eyes, and a calm demeanor that masks deep-seated guilt over a past mission failure.",
      "traits": ["determined", "analytical", "haunted", "protective"],
      "backstory": "Lost her previous crew 10 years ago in a failed rescue mission",
      "currentState": {
        "location": "Bridge of the Horizon",
        "emotionalState": "anxious",
        "physicalCondition": "healthy"
      },
      "relationships": [
        {
          "targetEntityId": "char_kai_002",
          "type": "commanding officer",
          "description": "Respects Kai's optimism, sees him as hope for next generation",
          "establishedInSegment": 1
        }
      ],
      "referenceAssets": {
        "portraitUrl": "https://cdn.storyforge.io/assets/char_maya_001_portrait.png",
        "voiceAnchorUrl": null,
        "styleFrameUrl": null
      },
      "introducedInSegment": 1,
      "lastAppearedInSegment": 5,
      "isActive": true,
      "isProtagonist": true
    },
    {
      "entityId": "char_kai_002",
      "canonicalName": "Kai Okonkwo",
      "aliases": ["First Officer Okonkwo", "Kai"],
      "forbiddenNames": ["Kyle", "Officer K"],
      "description": "32-year-old first officer, tall with dark skin, bright smile, always sees the opportunity in crisis.",
      "traits": ["optimistic", "loyal", "clever", "idealistic"],
      "backstory": "Graduated top of his class, chose Horizon over prestigious assignments",
      "currentState": {
        "location": "Bridge of the Horizon",
        "emotionalState": "excited",
        "physicalCondition": "healthy"
      },
      "relationships": [
        {
          "targetEntityId": "char_maya_001",
          "type": "serves under",
          "description": "Admires Captain Chen, wants to prove himself worthy",
          "establishedInSegment": 1
        }
      ],
      "referenceAssets": {
        "portraitUrl": null,
        "voiceAnchorUrl": null,
        "styleFrameUrl": null
      },
      "introducedInSegment": 1,
      "lastAppearedInSegment": 5,
      "isActive": true,
      "isProtagonist": false
    }
  ],
  
  "setting": {
    "primaryWorld": "Starship Horizon in deep space",
    "timePeriod": "Year 3042 CE",
    "worldRules": [
      {
        "rule": "FTL travel takes weeks/months, not instantaneous",
        "establishedInSegment": 1,
        "exceptions": []
      },
      {
        "rule": "Earth lost contact with colonies 500 years ago",
        "establishedInSegment": 1,
        "exceptions": []
      },
      {
        "rule": "AI is sentient but regulated by the Turing Accords",
        "establishedInSegment": 2,
        "exceptions": []
      }
    ],
    "locations": [
      {
        "name": "Bridge of the Horizon",
        "description": "Command center with wraparound viewscreen, captain's chair at center",
        "connectedTo": ["Captain's Ready Room", "Turbolift"],
        "introducedInSegment": 1
      }
    ],
    "technologyLevel": "Interstellar civilization, no teleportation, limited FTL",
    "magicSystem": null
  },
  
  "timeline": {
    "currentPoint": "Day 2 after receiving the Aurora signal",
    "timeProgression": [
      { "segmentNumber": 1, "timeElapsed": "Start" },
      { "segmentNumber": 2, "timeElapsed": "10 minutes later" },
      { "segmentNumber": 3, "timeElapsed": "1 hour later" },
      { "segmentNumber": 4, "timeElapsed": "Next morning" },
      { "segmentNumber": 5, "timeElapsed": "Same day, afternoon" }
    ],
    "majorEvents": [
      {
        "segmentNumber": 1,
        "timestamp": "Day 1, 0900 hours",
        "event": "Mysterious signal received from colony ship Aurora",
        "consequences": ["Crew debates response", "Course change initiated"],
        "charactersInvolved": ["char_maya_001", "char_kai_002"]
      },
      {
        "segmentNumber": 3,
        "timestamp": "Day 1, 1000 hours",
        "event": "Signal decoded: 'Do not come home. Earth is no longer Earth.'",
        "consequences": ["Crew morale shaken", "Maya orders investigation"],
        "charactersInvolved": ["char_maya_001"]
      }
    ]
  },
  
  "plotThreads": [
    {
      "id": "thread_aurora",
      "title": "The Aurora Mystery",
      "description": "Why is the Aurora warning them away from Earth?",
      "status": "active",
      "introducedInSegment": 1,
      "resolvedInSegment": null,
      "characters": ["char_maya_001", "char_kai_002"]
    },
    {
      "id": "thread_maya_past",
      "title": "Maya's Past Failure",
      "description": "Maya's guilt over losing her previous crew",
      "status": "active",
      "introducedInSegment": 2,
      "resolvedInSegment": null,
      "characters": ["char_maya_001"]
    }
  ],
  
  "styleGuide": {
    "tone": "tense, mysterious, with moments of crew camaraderie",
    "genres": ["space opera", "mystery", "drama"],
    "visualStyle": "Dark, atmospheric lighting with blue-tinted ship interiors",
    "narrativePOV": "third-limited",
    "povCharacter": "char_maya_001",
    "pacing": "medium",
    "contentRating": "PG-13",
    "avoidThemes": ["graphic violence", "explicit content"]
  },
  
  "establishedFacts": [
    {
      "fact": "The Horizon is the only ship within 6 months travel of the signal origin",
      "category": "world",
      "establishedInSegment": 1,
      "canBeContradicted": false
    },
    {
      "fact": "Maya has never told anyone about her previous mission failure",
      "category": "character",
      "establishedInSegment": 2,
      "canBeContradicted": true
    }
  ]
}
```

---

## 3. Character Entity IDs

### 3.1 Purpose
Entity IDs provide stable, machine-readable identifiers for characters that persist even if names change in dialogue.

### 3.2 Format
```
char_{name_slug}_{random_suffix}

Examples:
- char_maya_001
- char_kai_002
- char_mysterious_stranger_003
```

### 3.3 ID Assignment Rules

1. **New Characters**: When script expansion introduces a new character:
   - Extract the first mentioned name
   - Generate slug from name
   - Assign random suffix
   - Add to bible with full metadata

2. **Existing Characters**: When expanding script:
   - All character references must resolve to existing entity IDs
   - LLM outputs entity IDs in structured format
   - Validator checks all references

3. **Name Resolution**: Build alias map for script processing:
   ```python
   alias_map = {
       "Maya": "char_maya_001",
       "Captain Chen": "char_maya_001",
       "Captain": "char_maya_001",  # if unambiguous
       "Kai": "char_kai_002",
       "First Officer Okonkwo": "char_kai_002"
   }
   ```

---

## 4. Continuity Validator

### 4.1 Validation Pipeline

```
┌─────────────────┐
│ Expanded Script │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Character Name  │
│   Resolution    │──── Map all names to entity IDs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Name Drift     │
│   Detection     │──── Check for unrecognized names
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Personality    │
│  Consistency    │──── Verify actions match traits
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Timeline      │
│   Validation    │──── Check temporal consistency
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Setting      │
│   Compliance    │──── Verify world rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Relationship  │
│   Consistency   │──── Check character dynamics
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────┐
│           DECISION                  │
├─────────────┬──────────────────────┤
│   PASS      │        FAIL          │
│             │                      │
│ Proceed to  │  - Auto-correct?     │
│ video gen   │  - Return issues     │
│             │  - Request user edit │
└─────────────┴──────────────────────┘
```

### 4.2 Validation Rules

```python
class ContinuityRules:
    """Validation rules for continuity checking."""
    
    @staticmethod
    def check_name_drift(script: str, bible: SceneBible) -> list[Issue]:
        """Detect character name inconsistencies."""
        issues = []
        
        # Build name recognition patterns
        known_names = set()
        for char in bible.characters:
            known_names.add(char.canonical_name.lower())
            known_names.update(a.lower() for a in char.aliases)
        
        # Extract names from script (using NER or patterns)
        mentioned_names = extract_character_names(script)
        
        for name in mentioned_names:
            if name.lower() not in known_names:
                # Check if it's similar to existing character (typo?)
                closest = find_closest_match(name, known_names)
                if closest and similarity(name, closest) > 0.8:
                    issues.append(Issue(
                        type='name_drift',
                        severity='error',
                        description=f"'{name}' may be typo of '{closest}'",
                        suggestion=f"Use '{closest}' for consistency",
                        auto_fixable=True
                    ))
                else:
                    issues.append(Issue(
                        type='new_character',
                        severity='warning',
                        description=f"New character '{name}' introduced",
                        suggestion="Confirm this is a new character",
                        auto_fixable=False
                    ))
        
        return issues
    
    @staticmethod
    def check_forbidden_names(script: str, bible: SceneBible) -> list[Issue]:
        """Check for use of forbidden character names."""
        issues = []
        
        for char in bible.characters:
            for forbidden in char.forbidden_names:
                if forbidden.lower() in script.lower():
                    issues.append(Issue(
                        type='name_drift',
                        severity='error',
                        description=f"Forbidden name '{forbidden}' used for {char.canonical_name}",
                        suggestion=f"Use '{char.canonical_name}' or allowed alias",
                        auto_fixable=True,
                        fix=lambda s: s.replace(forbidden, char.canonical_name)
                    ))
        
        return issues
    
    @staticmethod
    def check_personality_consistency(
        script: str, 
        bible: SceneBible,
        llm_client: LLMClient
    ) -> list[Issue]:
        """Use LLM to check if character actions match personality."""
        
        prompt = f"""
        Analyze this script segment for personality consistency.
        
        Characters:
        {format_characters_for_prompt(bible.characters)}
        
        Script:
        {script}
        
        For each character action, verify it's consistent with their traits.
        Report any contradictions.
        
        Return JSON:
        {{
          "issues": [
            {{
              "character": "entity_id",
              "action": "what they did",
              "trait": "which trait it contradicts",
              "explanation": "why it's inconsistent"
            }}
          ]
        }}
        """
        
        result = llm_client.complete(prompt)
        return parse_personality_issues(result)
    
    @staticmethod
    def check_timeline(script: str, bible: SceneBible) -> list[Issue]:
        """Verify temporal consistency."""
        issues = []
        
        # Extract time references
        time_refs = extract_time_references(script)
        
        current_time = parse_story_time(bible.timeline.current_point)
        
        for ref in time_refs:
            if ref.is_past_reference:
                # Verify event actually happened
                if not event_exists_in_timeline(ref.event, bible.timeline):
                    issues.append(Issue(
                        type='timeline_error',
                        severity='warning',
                        description=f"Reference to unknown past event: {ref.event}",
                        suggestion="Add event to timeline or remove reference"
                    ))
            
            if ref.implies_time_passed:
                # Check if time progression is reasonable
                if ref.implied_time < current_time:
                    issues.append(Issue(
                        type='timeline_error',
                        severity='error',
                        description="Script implies time went backwards",
                        suggestion="Adjust time references"
                    ))
        
        return issues
    
    @staticmethod
    def check_world_rules(script: str, bible: SceneBible) -> list[Issue]:
        """Verify script doesn't violate established world rules."""
        issues = []
        
        for rule in bible.setting.world_rules:
            # Use pattern matching or LLM to detect violations
            if violates_rule(script, rule.rule):
                if not any(exception_applies(script, e) for e in rule.exceptions):
                    issues.append(Issue(
                        type='world_rule_violation',
                        severity='error',
                        description=f"Violates rule: {rule.rule}",
                        suggestion="Rewrite to comply with world rules"
                    ))
        
        return issues
    
    @staticmethod
    def check_location_consistency(script: str, bible: SceneBible) -> list[Issue]:
        """Verify character locations are consistent."""
        issues = []
        
        # Track character movements
        movements = extract_character_movements(script)
        
        for char_id, locations in movements.items():
            char = get_character(bible, char_id)
            if not char:
                continue
            
            current_loc = char.current_state.location
            
            for loc in locations:
                if loc != current_loc:
                    # Check if movement is shown or implied
                    if not movement_shown(script, char, current_loc, loc):
                        issues.append(Issue(
                            type='location_inconsistency',
                            severity='warning',
                            description=f"{char.canonical_name} appears in {loc} without traveling from {current_loc}",
                            suggestion="Add transition or movement description"
                        ))
                    current_loc = loc
        
        return issues
```

### 4.3 Severity Levels

| Severity | Description | Action |
|----------|-------------|--------|
| `error` | Hard contradiction, must fix | Block generation, return to user |
| `warning` | Potential issue, review | Auto-fix if possible, or flag |
| `info` | Observation, no action needed | Log for analytics |

### 4.4 Auto-Correction

```python
class AutoCorrector:
    """Attempt automatic fixes for minor issues."""
    
    def correct(
        self, 
        script: str, 
        issues: list[Issue]
    ) -> tuple[str, list[Issue]]:
        """
        Apply auto-corrections where possible.
        Returns corrected script and remaining issues.
        """
        corrected = script
        remaining = []
        
        for issue in issues:
            if issue.auto_fixable and issue.fix:
                corrected = issue.fix(corrected)
            else:
                remaining.append(issue)
        
        return corrected, remaining
    
    def correct_name_drift(self, script: str, wrong: str, correct: str) -> str:
        """Replace wrong name with correct name, preserving context."""
        # Simple replacement for exact matches
        corrected = script.replace(wrong, correct)
        
        # Handle possessive forms
        corrected = corrected.replace(f"{wrong}'s", f"{correct}'s")
        
        return corrected
    
    def correct_pronoun_gender(
        self, 
        script: str, 
        char: Character
    ) -> str:
        """Fix pronoun gender based on character description."""
        # Use LLM to identify and fix misgendered pronouns
        pass
```

---

## 5. Memory Strategy

### 5.1 Context Window Management

The script expansion LLM has limited context. We use a tiered strategy:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTEXT WINDOW                              │
├─────────────────────────────────────────────────────────────────┤
│ TIER 1: Always Include (High Priority)                          │
│ ├── Scene Bible (full)                         ~2000 tokens     │
│ ├── Current continuation text                   ~500 tokens     │
│ └── Style guide                                 ~200 tokens     │
├─────────────────────────────────────────────────────────────────┤
│ TIER 2: Recent Context (Medium Priority)                        │
│ ├── Last 3 segments (verbatim scripts)         ~3000 tokens     │
│ └── Recent timeline events                      ~500 tokens     │
├─────────────────────────────────────────────────────────────────┤
│ TIER 3: Compressed History (Lower Priority)                     │
│ └── Long-history summary                       ~1000 tokens     │
├─────────────────────────────────────────────────────────────────┤
│ TIER 4: Retrieval-Based (On Demand)                             │
│ └── Retrieved relevant passages                 ~500 tokens     │
│     (using embeddings if scene is very long)                    │
└─────────────────────────────────────────────────────────────────┘
                                                 ~7700 tokens total
```

### 5.2 Summary Generation

After every 5 segments, generate a compressed summary:

```python
class SummaryGenerator:
    def generate_summary(
        self,
        scene_id: str,
        segments: list[Segment],
        existing_summary: str | None
    ) -> str:
        """Generate compressed summary of scene history."""
        
        prompt = f"""
        Create a concise summary of the story so far.
        
        Previous summary:
        {existing_summary or "None - this is the start"}
        
        New segments to incorporate:
        {format_segments(segments)}
        
        Include:
        - Key plot developments
        - Character introductions and changes
        - Important decisions and consequences
        - Unresolved questions/threads
        
        Keep under 500 words. Focus on what's needed for continuity.
        """
        
        return self.llm.complete(prompt)
```

### 5.3 Retrieval for Long Scenes

For scenes with 20+ segments, use embedding-based retrieval:

```python
class SceneRetriever:
    def __init__(self, embedding_model):
        self.embedder = embedding_model
    
    def index_segment(self, segment: Segment) -> None:
        """Add segment to vector index."""
        embedding = self.embedder.embed(segment.expanded_script)
        self.vector_store.upsert(
            id=segment.id,
            vector=embedding,
            metadata={
                'scene_id': segment.scene_id,
                'sequence': segment.sequence,
                'characters': extract_character_ids(segment)
            }
        )
    
    def retrieve_relevant(
        self,
        continuation_text: str,
        scene_id: str,
        top_k: int = 3
    ) -> list[Segment]:
        """Retrieve most relevant past segments."""
        query_embedding = self.embedder.embed(continuation_text)
        
        results = self.vector_store.query(
            vector=query_embedding,
            filter={'scene_id': scene_id},
            top_k=top_k
        )
        
        return [self.get_segment(r.id) for r in results]
```

---

## 6. Reference Assets

### 6.1 Purpose
Reference assets provide visual and audio anchors to maintain consistency in generated video.

### 6.2 Asset Types

| Type | Purpose | Format |
|------|---------|--------|
| Portrait | Character face reference | PNG, 512x512+ |
| Style Frame | Visual style reference | PNG, 1920x1080 |
| Voice Anchor | Voice/speech reference | WAV, 10-30s sample |
| Character Sheet | Full character design | PNG with multiple views |

### 6.3 Integration with Video Generation

```python
class VideoGenerationConfig:
    def __init__(self, bible: SceneBible, segment_script: str):
        self.script = segment_script
        self.characters = self.extract_active_characters(segment_script, bible)
        
    def build_generation_prompt(self) -> dict:
        """Build prompt with reference assets."""
        
        character_refs = []
        for char in self.characters:
            if char.reference_assets.portrait_url:
                character_refs.append({
                    'entity_id': char.entity_id,
                    'name': char.canonical_name,
                    'portrait_url': char.reference_assets.portrait_url,
                    'description': char.description
                })
        
        return {
            'script': self.script,
            'style': self.bible.style_guide.visual_style,
            'character_references': character_refs,
            'tone': self.bible.style_guide.tone
        }
```

---

## 7. Versioning and Locking

### 7.1 Optimistic Locking

```typescript
// API: Continue scene
async function continueScene(
  sceneId: string,
  userId: string,
  continuationText: string,
  clientBibleVersion: number
): Promise<Job> {
  // Fetch current scene
  const scene = await db.scenes.findUnique({ where: { id: sceneId } });
  
  // Check version match
  if (scene.bibleVersion !== clientBibleVersion) {
    throw new ConflictError({
      code: 'BIBLE_VERSION_MISMATCH',
      yourVersion: clientBibleVersion,
      currentVersion: scene.bibleVersion,
      message: 'Scene was updated by another user'
    });
  }
  
  // Create job with version lock
  const job = await db.jobs.create({
    data: {
      sceneId,
      userId,
      inputText: continuationText,
      bibleVersion: scene.bibleVersion,
      status: 'queued'
    }
  });
  
  // Enqueue for processing
  await queue.add('generation', { jobId: job.id });
  
  return job;
}
```

### 7.2 Version Increment

```python
# Worker: After successful segment creation
async def finalize_segment(job_id: str, segment_data: dict):
    async with db.transaction():
        # Create segment
        segment = await db.segments.create(segment_data)
        
        # Update bible with new version
        current_bible = await db.scene_bibles.find_latest(segment_data['scene_id'])
        
        new_bible = update_bible_from_segment(current_bible, segment_data)
        
        await db.scene_bibles.create({
            'scene_id': segment_data['scene_id'],
            'version': current_bible.version + 1,
            'data': new_bible,
            'created_by_segment_id': segment.id
        })
        
        # Update scene's bible version
        await db.scenes.update(
            where={'id': segment_data['scene_id']},
            data={'bible_version': current_bible.version + 1}
        )
```

### 7.3 Fork/Rebase (V2 Feature)

For future version: Allow parallel story branches.

```typescript
interface SceneFork {
  id: string;
  parentSceneId: string;
  forkPointSegment: number;
  title: string;
  bibleSnapshot: SceneBible;  // Bible at fork point
}

// Rebase: Merge updates from parent
async function rebaseToParent(forkId: string): Promise<RebaseResult> {
  const fork = await db.forks.findUnique({ where: { id: forkId } });
  const parent = await db.scenes.findUnique({ where: { id: fork.parentSceneId } });
  
  // Get new segments from parent since fork
  const newParentSegments = await db.segments.findMany({
    where: {
      sceneId: parent.id,
      sequence: { gt: fork.forkPointSegment }
    }
  });
  
  // Detect conflicts
  const conflicts = detectConflicts(fork.bibleSnapshot, parent.bible, newParentSegments);
  
  if (conflicts.length > 0) {
    return {
      success: false,
      conflicts,
      message: 'Manual resolution required'
    };
  }
  
  // Auto-merge bible updates
  const mergedBible = mergeBibles(fork.bibleSnapshot, parent.bible);
  
  return {
    success: true,
    mergedBible,
    newSegmentsAvailable: newParentSegments.length
  };
}
```

---

## 8. Bible Update Process

After each successful segment, the bible is updated:

```python
def update_bible_from_segment(
    current_bible: SceneBible,
    segment: Segment,
    analysis: SegmentAnalysis
) -> SceneBible:
    """Update Scene Bible with information from new segment."""
    
    bible = copy.deepcopy(current_bible)
    bible.version += 1
    bible.updated_by_segment_id = segment.id
    
    # Update characters
    for char_update in analysis.character_updates:
        char = find_character(bible, char_update.entity_id)
        if char:
            # Update current state
            char.current_state = char_update.new_state
            char.last_appeared_in_segment = segment.sequence
            
            # Add new relationships
            for new_rel in char_update.new_relationships:
                if not has_relationship(char, new_rel.target_id):
                    char.relationships.append(new_rel)
    
    # Add new characters
    for new_char in analysis.new_characters:
        bible.characters.append(new_char)
    
    # Update timeline
    bible.timeline.current_point = analysis.new_time_point
    bible.timeline.time_progression.append({
        'segment_number': segment.sequence,
        'time_elapsed': analysis.time_elapsed
    })
    
    for event in analysis.major_events:
        bible.timeline.major_events.append(event)
    
    # Update plot threads
    for thread_update in analysis.plot_thread_updates:
        thread = find_thread(bible, thread_update.id)
        if thread:
            thread.status = thread_update.new_status
            if thread_update.resolved:
                thread.resolved_in_segment = segment.sequence
    
    # Add new established facts
    bible.established_facts.extend(analysis.new_facts)
    
    return bible
```

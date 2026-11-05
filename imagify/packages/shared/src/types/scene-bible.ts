// Scene Bible types - Continuity management

export interface SceneBible {
  sceneId: string;
  version: number;
  characters: Record<string, Character>;
  locations: Record<string, Location>;
  objects: Record<string, StoryObject>;
  timeline: TimelineEvent[];
  relationships: Relationship[];
  rules: StoryRule[];
  metadata: BibleMetadata;
}

export interface Character {
  entityId: string;
  name: string;
  aliases: string[];
  physicalDescription: PhysicalDescription;
  personality: string[];
  backstory: string;
  firstAppearance: SegmentReference;
  referenceFrames: string[];
  status: 'alive' | 'deceased' | 'unknown';
}

export interface PhysicalDescription {
  age: string;
  gender: string;
  height: string;
  build: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  distinguishingFeatures: string[];
  clothing: ClothingState[];
}

export interface ClothingState {
  segmentRange: [number, number];
  description: string;
}

export interface Location {
  entityId: string;
  name: string;
  description: string;
  type: string;
  features: string[];
  firstAppearance: SegmentReference;
  referenceFrames: string[];
}

export interface StoryObject {
  entityId: string;
  name: string;
  description: string;
  significance: string;
  currentLocation: string | null;
  currentOwner: string | null;
  firstAppearance: SegmentReference;
}

export interface TimelineEvent {
  segmentId: string;
  sequence: number;
  timestamp: string;
  description: string;
  characters: string[];
  location: string | null;
}

export interface Relationship {
  character1: string;
  character2: string;
  type: string;
  description: string;
  establishedAt: SegmentReference;
}

export interface StoryRule {
  id: string;
  rule: string;
  reason: string;
  establishedAt: SegmentReference;
}

export interface SegmentReference {
  segmentId: string;
  sequence: number;
}

export interface BibleMetadata {
  createdAt: string;
  updatedAt: string;
  segmentCount: number;
  lastSegmentId: string;
}

// Continuity validation
export interface ContinuityViolation {
  type: 'error' | 'warning';
  category: string;
  message: string;
  entityId?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ContinuityViolation[];
  autoCorrections: AutoCorrection[];
}

export interface AutoCorrection {
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

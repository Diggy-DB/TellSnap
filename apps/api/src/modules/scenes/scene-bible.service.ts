import { Injectable } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';

// Types for Scene Bible JSON data
interface Character {
  id: string;
  name: string;
  description?: string;
  physicalDescription?: {
    build?: string;
    hairColor?: string;
    eyeColor?: string;
  };
  referenceFrames?: string[];
  status: 'alive' | 'deceased' | 'unknown';
}

interface Location {
  id: string;
  name: string;
  description?: string;
  features?: string[];
}

interface TimelineEvent {
  segmentIndex: number;
  description: string;
  timestamp?: string;
}

export interface SceneBibleData {
  characters: Record<string, Character>;
  locations: Record<string, Location>;
  objects: Record<string, { id: string; name: string; currentOwner?: string }>;
  timeline: TimelineEvent[];
  rules: { id: string; rule: string; type: 'hard' | 'soft' }[];
}

interface SceneBibleDocument extends SceneBibleData {
  id: string;
  sceneId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SceneBibleService {
  constructor(
    private firestore: FirestoreService,
    private redis: RedisService,
  ) {}

  async getForScene(sceneId: string): Promise<SceneBibleData> {
    // Try cache first
    const cached = await this.redis.get(`bible:${sceneId}`);
    if (cached) return cached as SceneBibleData;

    // Query by sceneId
    const bibles = await this.firestore.findMany<SceneBibleDocument>('sceneBibles', {
      where: [{ field: 'sceneId', op: '==', value: sceneId }],
      limit: 1,
    });

    if (bibles.length === 0) {
      return this.createEmptyBible();
    }

    const bible = bibles[0];
    const data: SceneBibleData = {
      characters: bible.characters || {},
      locations: bible.locations || {},
      objects: bible.objects || {},
      timeline: bible.timeline || [],
      rules: bible.rules || [],
    };

    // Cache for 5 minutes
    await this.redis.set(`bible:${sceneId}`, data, 300);

    return data;
  }

  async update(sceneId: string, updates: Partial<SceneBibleData>): Promise<SceneBibleData> {
    // Check if bible exists
    const existing = await this.firestore.findMany<SceneBibleDocument>('sceneBibles', {
      where: [{ field: 'sceneId', op: '==', value: sceneId }],
      limit: 1,
    });

    if (existing.length === 0) {
      // Create new bible
      const newBible: Omit<SceneBibleDocument, 'id'> = {
        sceneId,
        characters: updates.characters || {},
        locations: updates.locations || {},
        objects: updates.objects || {},
        timeline: updates.timeline || [],
        rules: updates.rules || [],
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.firestore.create('sceneBibles', newBible);
    } else {
      // Update existing
      const updateData: Partial<SceneBibleDocument> = {
        updatedAt: new Date(),
      };
      
      if (updates.characters) updateData.characters = updates.characters;
      if (updates.locations) updateData.locations = updates.locations;
      if (updates.objects) updateData.objects = updates.objects;
      if (updates.timeline) updateData.timeline = updates.timeline;
      if (updates.rules) updateData.rules = updates.rules;

      await this.firestore.update('sceneBibles', existing[0].id, updateData);
      // Increment version
      await this.firestore.increment('sceneBibles', existing[0].id, 'version', 1);
    }

    // Invalidate cache
    await this.redis.del(`bible:${sceneId}`);

    return this.getForScene(sceneId);
  }

  async addCharacter(sceneId: string, character: Character): Promise<SceneBibleData> {
    const bible = await this.getForScene(sceneId);
    bible.characters[character.id] = character;
    return this.update(sceneId, { characters: bible.characters });
  }

  async addLocation(sceneId: string, location: Location): Promise<SceneBibleData> {
    const bible = await this.getForScene(sceneId);
    bible.locations[location.id] = location;
    return this.update(sceneId, { locations: bible.locations });
  }

  async addTimelineEvent(sceneId: string, event: TimelineEvent): Promise<SceneBibleData> {
    const bible = await this.getForScene(sceneId);
    bible.timeline.push(event);
    return this.update(sceneId, { timeline: bible.timeline });
  }

  private createEmptyBible(): SceneBibleData {
    return {
      characters: {},
      locations: {},
      objects: {},
      timeline: [],
      rules: [],
    };
  }
}

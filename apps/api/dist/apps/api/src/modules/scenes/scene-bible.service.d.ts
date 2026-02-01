import { FirestoreService } from '../../firestore/firestore.service';
import { RedisService } from '../../redis/redis.service';
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
    objects: Record<string, {
        id: string;
        name: string;
        currentOwner?: string;
    }>;
    timeline: TimelineEvent[];
    rules: {
        id: string;
        rule: string;
        type: 'hard' | 'soft';
    }[];
}
export declare class SceneBibleService {
    private firestore;
    private redis;
    constructor(firestore: FirestoreService, redis: RedisService);
    getForScene(sceneId: string): Promise<SceneBibleData>;
    update(sceneId: string, updates: Partial<SceneBibleData>): Promise<SceneBibleData>;
    addCharacter(sceneId: string, character: Character): Promise<SceneBibleData>;
    addLocation(sceneId: string, location: Location): Promise<SceneBibleData>;
    addTimelineEvent(sceneId: string, event: TimelineEvent): Promise<SceneBibleData>;
    private createEmptyBible;
}
export {};

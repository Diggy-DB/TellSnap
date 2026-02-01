import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const signupSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    username: string;
}, {
    email: string;
    password: string;
    username: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export declare const createSceneSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    topicId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    initialPrompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    topicId: string;
    initialPrompt: string;
    categoryId?: string | undefined;
}, {
    title: string;
    description: string;
    topicId: string;
    initialPrompt: string;
    categoryId?: string | undefined;
}>;
export declare const continueSceneSchema: z.ZodObject<{
    parentSegmentId: z.ZodString;
    prompt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    parentSegmentId: string;
    prompt: string;
}, {
    parentSegmentId: string;
    prompt: string;
}>;
export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type ContinueSceneInput = z.infer<typeof continueSceneSchema>;
export declare const createTopicSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
}, {
    description: string;
    name: string;
}>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export declare const createIdeaSchema: z.ZodObject<{
    topicId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    topicId: string;
}, {
    title: string;
    description: string;
    topicId: string;
}>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    cursor?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
export type PaginationInput = z.infer<typeof paginationSchema>;

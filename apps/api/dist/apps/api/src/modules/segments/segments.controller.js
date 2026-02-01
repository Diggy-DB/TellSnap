"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const segments_service_1 = require("./segments.service");
const dto_1 = require("./dto");
let SegmentsController = class SegmentsController {
    segmentsService;
    constructor(segmentsService) {
        this.segmentsService = segmentsService;
    }
    async getById(id) {
        return this.segmentsService.findById(id);
    }
    async getForScene(sceneId) {
        return this.segmentsService.getForScene(sceneId);
    }
    async submitSegment(dto, req) {
        return this.segmentsService.submitSegment(dto, req.user.sub);
    }
    async generateComic(dto, req) {
        return this.segmentsService.generateComic(dto, req.user.sub);
    }
    async submitAndGenerate(dto, req) {
        return this.segmentsService.submitAndGenerate(dto, req.user.sub);
    }
    async getJobStatus(jobId) {
        return this.segmentsService.getJobStatus(jobId);
    }
};
exports.SegmentsController = SegmentsController;
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get segment by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Segment found', type: dto_1.SegmentResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Segment not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "getById", null);
__decorate([
    (0, common_1.Get)('scene/:sceneId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all segments for a scene' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of segments', type: [dto_1.SegmentResponseDto] }),
    __param(0, (0, common_1.Param)('sceneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "getForScene", null);
__decorate([
    (0, common_1.Post)('submit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Submit a new segment prompt',
        description: 'Creates a new segment with the user-provided story prompt. The segment is created in PENDING status.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Segment created', type: dto_1.SegmentResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input or duplicate order index' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Scene not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SubmitSegmentDto, Object]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "submitSegment", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Start comic generation for a segment',
        description: 'Queues a segment for comic page generation. The prompt is expanded using ChatGPT and then comic panels are generated using Google Imagen 3.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Generation job created', type: dto_1.JobStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Generation already in progress' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Segment not found' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.GenerateVideoDto, Object]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "generateComic", null);
__decorate([
    (0, common_1.Post)('submit-and-generate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Submit a segment and immediately start comic generation',
        description: 'Combines segment creation and comic generation into a single call. Creates the segment, queues it for processing with ChatGPT script expansion, then generates comic panels with Google Imagen 3.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Segment created and generation queued',
        schema: {
            type: 'object',
            properties: {
                segment: { $ref: '#/components/schemas/SegmentResponseDto' },
                job: { $ref: '#/components/schemas/JobStatusDto' },
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SubmitSegmentDto, Object]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "submitAndGenerate", null);
__decorate([
    (0, common_1.Get)('job/:jobId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get video generation job status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job status', type: dto_1.JobStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Job not found' }),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SegmentsController.prototype, "getJobStatus", null);
exports.SegmentsController = SegmentsController = __decorate([
    (0, swagger_1.ApiTags)('segments'),
    (0, common_1.Controller)('segments'),
    __metadata("design:paramtypes", [segments_service_1.SegmentsService])
], SegmentsController);
//# sourceMappingURL=segments.controller.js.map
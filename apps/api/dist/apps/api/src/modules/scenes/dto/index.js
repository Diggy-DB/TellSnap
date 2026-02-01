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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListScenesQueryDto = exports.ContinueSceneDto = exports.CreateSceneDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateSceneDto {
    title;
    description;
    topicId;
    initialPrompt;
}
exports.CreateSceneDto = CreateSceneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'The Lost City' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateSceneDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'An adventure into an ancient civilization' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateSceneDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateSceneDto.prototype, "topicId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A group of explorers discover a hidden entrance to a lost city' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateSceneDto.prototype, "initialPrompt", void 0);
class ContinueSceneDto {
    parentSegmentId;
    prompt;
}
exports.ContinueSceneDto = ContinueSceneDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContinueSceneDto.prototype, "parentSegmentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'The explorers venture deeper into the temple' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], ContinueSceneDto.prototype, "prompt", void 0);
class ListScenesQueryDto {
    page = 1;
    limit = 20;
    topicId;
    categoryId;
    sort = 'recent';
}
exports.ListScenesQueryDto = ListScenesQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ListScenesQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 20 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ListScenesQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListScenesQueryDto.prototype, "topicId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListScenesQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['recent', 'popular', 'trending'] }),
    (0, class_validator_1.IsIn)(['recent', 'popular', 'trending']),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListScenesQueryDto.prototype, "sort", void 0);
//# sourceMappingURL=index.js.map
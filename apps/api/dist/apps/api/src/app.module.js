"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const auth_module_1 = require("./modules/auth/auth.module");
const topics_module_1 = require("./modules/topics/topics.module");
const scenes_module_1 = require("./modules/scenes/scenes.module");
const segments_module_1 = require("./modules/segments/segments.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const firestore_module_1 = require("./firestore/firestore.module");
const redis_module_1 = require("./redis/redis.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
            }),
            firestore_module_1.FirestoreModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            topics_module_1.TopicsModule,
            scenes_module_1.ScenesModule,
            segments_module_1.SegmentsModule,
            jobs_module_1.JobsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
import { IsString, IsNotEmpty, IsInt, IsOptional, Min, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitSegmentDto {
  @ApiProperty({
    description: 'The scene ID this segment belongs to',
    example: 'scene-stellar-odyssey',
  })
  @IsString()
  @IsNotEmpty()
  sceneId: string;

  @ApiProperty({
    description: 'The user story prompt/script for this segment',
    example: 'Captain Maya Chen discovers an ancient artifact floating in the nebula.',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  prompt: string;

  @ApiPropertyOptional({
    description: 'Optional order index. If not provided, will be appended to the end.',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;
}

export class GenerateVideoDto {
  @ApiProperty({
    description: 'The segment ID to generate video for',
    example: 'clxyz123...',
  })
  @IsString()
  @IsNotEmpty()
  segmentId: string;

  @ApiPropertyOptional({
    description: 'Video aspect ratio',
    example: '16:9',
    default: '16:9',
  })
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional({
    description: 'Target video duration in seconds',
    example: 15,
    default: 8,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  durationSeconds?: number;
}

export class SegmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sceneId: string;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty()
  prompt: string;

  @ApiPropertyOptional()
  expandedScript?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  hlsUrl?: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  createdBy: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

export class JobStatusDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  segmentId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  progress: number;

  @ApiPropertyOptional()
  stage?: string;

  @ApiPropertyOptional()
  error?: string;
}

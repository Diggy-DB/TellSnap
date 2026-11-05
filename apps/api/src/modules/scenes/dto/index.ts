import { IsString, IsOptional, MinLength, MaxLength, IsInt, Min, Max, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSceneDto {
  @ApiProperty({ example: 'The Lost City' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'An adventure into an ancient civilization' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  topicId?: string;

  @ApiProperty({ example: 'A group of explorers discover a hidden entrance to a lost city' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  initialPrompt: string;
}

export class ContinueSceneDto {
  @ApiProperty()
  @IsString()
  parentSegmentId: string;

  @ApiProperty({ example: 'The explorers venture deeper into the temple' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  prompt: string;
}

export class ListScenesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  topicId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by genre (action, romance, fantasy, horror, comedy, drama, sci-fi, slice-of-life)' })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiPropertyOptional({ enum: ['recent', 'popular', 'trending'] })
  @IsIn(['recent', 'popular', 'trending'])
  @IsOptional()
  sort?: 'recent' | 'popular' | 'trending' = 'recent';
}

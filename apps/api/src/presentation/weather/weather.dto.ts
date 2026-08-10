import { IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ThresholdRangeDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() goMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cautionMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() goMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cautionMin?: number;
}

export class FlightThresholdsDto {
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ThresholdRangeDto) windSpeedMs?: ThresholdRangeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ThresholdRangeDto) windGustMs?: ThresholdRangeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ThresholdRangeDto) visibilityKm?: ThresholdRangeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ThresholdRangeDto) precipitationMmH?: ThresholdRangeDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => ThresholdRangeDto) temperatureC?: ThresholdRangeDto;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxSourceSpreadMs?: number;
}

class SourceWeightDto {
  @ApiProperty() sourceId!: string;
  @ApiProperty() @IsNumber() @Min(0) weight!: number;
}

export class WeatherEvaluateDto {
  @ApiProperty({ example: 55.75 }) @IsNumber() @Min(-90) @Max(90) lat!: number;
  @ApiProperty({ example: 37.62 }) @IsNumber() @Min(-180) @Max(180) lon!: number;
  @ApiPropertyOptional() @IsOptional() timestamp?: string;
  @ApiProperty({ type: FlightThresholdsDto }) @ValidateNested() @Type(() => FlightThresholdsDto) thresholds!: FlightThresholdsDto;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() sourceIds?: string[];
  @ApiPropertyOptional({ type: [SourceWeightDto] }) @IsOptional() @ValidateNested({ each: true }) @Type(() => SourceWeightDto) weights?: SourceWeightDto[];
}

export class WeatherQueryDto {
  @ApiProperty({ example: 55.75 }) @IsNumber() lat!: number;
  @ApiProperty({ example: 37.62 }) @IsNumber() lon!: number;
  @ApiPropertyOptional() @IsOptional() timestamp?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() sourceIds?: string[];
}

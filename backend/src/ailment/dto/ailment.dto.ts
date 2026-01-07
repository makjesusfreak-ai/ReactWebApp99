import { InputType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApplicationType,
  TreatmentType,
  SettingType,
} from '../entities/ailment.entity';

// Side Effect Input
@InputType()
export class SideEffectInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  duration: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  severity: number;
}

// Treatment Input
@InputType()
export class TreatmentInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String)
  @IsEnum(ApplicationType)
  application: ApplicationType;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  efficacy: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  duration: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity: number;

  @Field(() => String)
  @IsEnum(TreatmentType)
  type: TreatmentType;

  @Field(() => [SideEffectInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SideEffectInput)
  sideEffects?: SideEffectInput[];

  @Field(() => String)
  @IsEnum(SettingType)
  setting: SettingType;

  @Field()
  @IsBoolean()
  isPreventative: boolean;

  @Field()
  @IsBoolean()
  isPalliative: boolean;

  @Field()
  @IsBoolean()
  isCurative: boolean;
}

// Diagnostic Input
@InputType()
export class DiagnosticInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  efficacy: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  duration: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity: number;

  @Field(() => String)
  @IsEnum(TreatmentType)
  type: TreatmentType;

  @Field(() => [SideEffectInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SideEffectInput)
  sideEffects?: SideEffectInput[];

  @Field(() => String)
  @IsEnum(SettingType)
  setting: SettingType;
}

// Ailment Details Input
@InputType()
export class AilmentDetailsInput {
  @Field()
  @IsString()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  duration: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  intensity: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  severity: number;
}

// Create Ailment Input
@InputType()
export class CreateAilmentInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field(() => AilmentDetailsInput)
  @ValidateNested()
  @Type(() => AilmentDetailsInput)
  ailment: AilmentDetailsInput;

  @Field(() => [TreatmentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentInput)
  treatments?: TreatmentInput[];

  @Field(() => [DiagnosticInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticInput)
  diagnostics?: DiagnosticInput[];
}

// Update Ailment Input
@InputType()
export class UpdateAilmentInput {
  @Field(() => AilmentDetailsInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AilmentDetailsInput)
  ailment?: AilmentDetailsInput;

  @Field(() => [TreatmentInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentInput)
  treatments?: TreatmentInput[];

  @Field(() => [DiagnosticInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagnosticInput)
  diagnostics?: DiagnosticInput[];
}

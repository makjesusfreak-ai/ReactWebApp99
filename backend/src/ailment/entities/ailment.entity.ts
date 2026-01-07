import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';

// Enums
export enum ApplicationType {
  ORAL = 'oral',
  IV = 'IV',
  TOPICAL = 'topical',
  SURGICAL = 'surgical',
}

export enum TreatmentType {
  HOLISTIC = 'holistic',
  SYMPTOM_BASED = 'symptom-based',
}

export enum SettingType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  HOME = 'home',
}

registerEnumType(ApplicationType, { name: 'ApplicationType' });
registerEnumType(TreatmentType, { name: 'TreatmentType' });
registerEnumType(SettingType, { name: 'SettingType' });

// Side Effect Entity
@ObjectType()
export class SideEffect {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  duration: number; // seconds

  @Field(() => Int)
  intensity: number; // 0-100

  @Field(() => Int)
  severity: number; // 0-100
}

// Treatment Entity
@ObjectType()
export class Treatment {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ApplicationType)
  application: ApplicationType;

  @Field(() => Int)
  efficacy: number; // 0-100

  @Field(() => Int)
  duration: number; // seconds

  @Field(() => Int)
  intensity: number; // 0-100

  @Field(() => TreatmentType)
  type: TreatmentType;

  @Field(() => [SideEffect])
  sideEffects: SideEffect[];

  @Field(() => SettingType)
  setting: SettingType;

  @Field()
  isPreventative: boolean;

  @Field()
  isPalliative: boolean;

  @Field()
  isCurative: boolean;
}

// Diagnostic Entity
@ObjectType()
export class Diagnostic {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  efficacy: number; // 0-100

  @Field(() => Int)
  duration: number; // seconds

  @Field(() => Int)
  intensity: number; // 0-100

  @Field(() => TreatmentType)
  type: TreatmentType;

  @Field(() => [SideEffect])
  sideEffects: SideEffect[];

  @Field(() => SettingType)
  setting: SettingType;
}

// Ailment Details (nested object)
@ObjectType()
export class AilmentDetails {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  duration: number; // seconds

  @Field(() => Int)
  intensity: number; // 0-100

  @Field(() => Int)
  severity: number; // 0-100
}

// Main Ailment Entity
@ObjectType()
export class Ailment {
  @Field(() => ID)
  id: string;

  @Field(() => AilmentDetails)
  ailment: AilmentDetails;

  @Field(() => [Treatment])
  treatments: Treatment[];

  @Field(() => [Diagnostic])
  diagnostics: Diagnostic[];
}

// Delete response
@ObjectType()
export class DeleteResponse {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;
}

// Subscription payload
@ObjectType()
export class AilmentChangePayload {
  @Field()
  type: string; // CREATE, UPDATE, DELETE

  @Field(() => Ailment)
  ailment: Ailment;
}

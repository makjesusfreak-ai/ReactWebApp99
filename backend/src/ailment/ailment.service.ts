import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { RedisService } from '../redis/redis.service';
import { Ailment, SideEffect, Treatment, Diagnostic } from './entities';
import { CreateAilmentInput, UpdateAilmentInput } from './dto';

@Injectable()
export class AilmentService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly redisService: RedisService,
  ) {}

  async findAll(): Promise<Ailment[]> {
    return this.redisService.getOrSet<Ailment[]>(
      'ailments:all',
      async () => {
        const ailments = await this.dynamoDBService.scan<Ailment>();
        return ailments || [];
      },
      this.CACHE_TTL,
    );
  }

  async findOne(id: string): Promise<Ailment | null> {
    return this.redisService.getOrSet<Ailment | null>(
      `ailment:${id}`,
      async () => {
        return this.dynamoDBService.getItem<Ailment>(id);
      },
      this.CACHE_TTL,
    );
  }

  async create(input: CreateAilmentInput): Promise<Ailment> {
    const ailment: Ailment = {
      id: input.id || uuidv4(),
      ailment: {
        name: input.ailment.name,
        description: input.ailment.description || '',
        duration: input.ailment.duration,
        intensity: input.ailment.intensity,
        severity: input.ailment.severity,
      },
      treatments: this.processTreatments(input.treatments || []),
      diagnostics: this.processDiagnostics(input.diagnostics || []),
    };

    await this.dynamoDBService.putItem(ailment);
    await this.redisService.invalidateAilmentCache();

    return ailment;
  }

  async update(id: string, input: UpdateAilmentInput): Promise<Ailment | null> {
    const existing = await this.findOne(id);
    if (!existing) {
      return null;
    }

    const updated: Ailment = {
      id,
      ailment: input.ailment
        ? {
            name: input.ailment.name,
            description: input.ailment.description || '',
            duration: input.ailment.duration,
            intensity: input.ailment.intensity,
            severity: input.ailment.severity,
          }
        : existing.ailment,
      treatments: input.treatments
        ? this.processTreatments(input.treatments)
        : existing.treatments,
      diagnostics: input.diagnostics
        ? this.processDiagnostics(input.diagnostics)
        : existing.diagnostics,
    };

    await this.dynamoDBService.putItem(updated);
    await this.redisService.invalidateAilmentCache(id);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dynamoDBService.deleteItem(id);
    if (result) {
      await this.redisService.invalidateAilmentCache(id);
    }
    return result;
  }

  private processTreatments(treatments: any[]): Treatment[] {
    return treatments.map((t) => ({
      id: t.id || uuidv4(),
      name: t.name,
      description: t.description || '',
      application: t.application,
      efficacy: t.efficacy,
      duration: t.duration,
      intensity: t.intensity,
      type: t.type,
      sideEffects: this.processSideEffects(t.sideEffects || []),
      setting: t.setting,
      isPreventative: t.isPreventative || false,
      isPalliative: t.isPalliative || false,
      isCurative: t.isCurative || false,
    }));
  }

  private processDiagnostics(diagnostics: any[]): Diagnostic[] {
    return diagnostics.map((d) => ({
      id: d.id || uuidv4(),
      name: d.name,
      description: d.description || '',
      efficacy: d.efficacy,
      duration: d.duration,
      intensity: d.intensity,
      type: d.type,
      sideEffects: this.processSideEffects(d.sideEffects || []),
      setting: d.setting,
    }));
  }

  private processSideEffects(sideEffects: any[]): SideEffect[] {
    return sideEffects.map((s) => ({
      id: s.id || uuidv4(),
      name: s.name,
      description: s.description || '',
      duration: s.duration,
      intensity: s.intensity,
      severity: s.severity,
    }));
  }
}

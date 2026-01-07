import { Resolver, Query, Mutation, Args, ID, Subscription } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { AilmentService } from './ailment.service';
import { Ailment, DeleteResponse, AilmentChangePayload } from './entities';
import { CreateAilmentInput, UpdateAilmentInput } from './dto';
import { PUB_SUB } from '../pubsub/pubsub.module';

const AILMENT_CREATED = 'ailmentCreated';
const AILMENT_UPDATED = 'ailmentUpdated';
const AILMENT_DELETED = 'ailmentDeleted';

@Resolver(() => Ailment)
export class AilmentResolver {
  constructor(
    private readonly ailmentService: AilmentService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // Queries
  @Query(() => [Ailment], { name: 'getAilments' })
  async findAll(): Promise<Ailment[]> {
    return this.ailmentService.findAll();
  }

  @Query(() => Ailment, { name: 'getAilment', nullable: true })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Ailment | null> {
    return this.ailmentService.findOne(id);
  }

  // Mutations
  @Mutation(() => Ailment)
  async createAilment(
    @Args('input') input: CreateAilmentInput,
  ): Promise<Ailment> {
    const ailment = await this.ailmentService.create(input);
    
    // Publish to subscribers
    this.pubSub.publish(AILMENT_CREATED, { ailmentCreated: ailment });
    
    return ailment;
  }

  @Mutation(() => Ailment, { nullable: true })
  async updateAilment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateAilmentInput,
  ): Promise<Ailment | null> {
    const ailment = await this.ailmentService.update(id, input);
    
    if (ailment) {
      // Publish to subscribers
      this.pubSub.publish(AILMENT_UPDATED, { ailmentUpdated: ailment });
    }
    
    return ailment;
  }

  @Mutation(() => DeleteResponse)
  async deleteAilment(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<DeleteResponse> {
    // Get ailment before deletion for subscription payload
    const ailment = await this.ailmentService.findOne(id);
    const success = await this.ailmentService.delete(id);
    
    if (success && ailment) {
      // Publish to subscribers
      this.pubSub.publish(AILMENT_DELETED, { ailmentDeleted: { id } });
    }
    
    return {
      success,
      message: success ? 'Ailment deleted successfully' : 'Failed to delete ailment',
    };
  }

  // Subscriptions for real-time updates
  @Subscription(() => Ailment, { name: 'ailmentCreated' })
  subscribeToAilmentCreated() {
    return this.pubSub.asyncIterator(AILMENT_CREATED);
  }

  @Subscription(() => Ailment, { name: 'ailmentUpdated' })
  subscribeToAilmentUpdated() {
    return this.pubSub.asyncIterator(AILMENT_UPDATED);
  }

  @Subscription(() => DeleteResponse, { name: 'ailmentDeleted' })
  subscribeToAilmentDeleted() {
    return this.pubSub.asyncIterator(AILMENT_DELETED);
  }
}

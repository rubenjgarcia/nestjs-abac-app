import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { PolicyController } from './policies.controller';
import { PolicyService } from './policies.service';
import { CreatePolicyDto } from './dtos/create-policy.dto';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreatePolicy,
  GetPolicy,
  ListPolicies,
  PolicyScope,
  RemovePolicy,
  UpdatePolicy,
} from './policies.actions';

describe('PolicyController', () => {
  let policyController: PolicyController;
  let policyService: PolicyService;

  const policyCreateDto: CreatePolicyDto = {
    name: 'Foo',
    effect: Effect.Allow,
    actions: ['Foo:Action'],
    resources: ['*'],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        {
          provide: PolicyService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Foo',
              effect: Effect.Allow,
              actions: ['Foo:Action'],
              resources: ['*'],
            }),
            findAll: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId('000000000000'),
                name: 'Foo',
                effect: Effect.Allow,
                actions: ['Foo:Action'],
                resources: ['*'],
              },
              {
                _id: new Types.ObjectId('000000000001'),
                name: 'Bar',
                effect: Effect.Allow,
                actions: ['Bar:Action'],
                resources: ['*'],
              },
            ]),
            create: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Foo',
              effect: Effect.Allow,
              actions: ['Foo:Action'],
              resources: ['*'],
            }),
            update: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Bar',
              effect: Effect.Deny,
              actions: ['Bar:Action'],
              resources: ['000000000000'],
            }),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    policyService = module.get<PolicyService>(PolicyService);
    policyController = module.get<PolicyController>(PolicyController);
  });

  describe('create', () => {
    it('should create a policy', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${CreatePolicy}`],
            resources: ['*'],
          },
        ],
      };
      await expect(
        policyController.create(policyCreateDto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });
      expect(policyService.create).toHaveBeenCalledWith(
        policyCreateDto,
        request.user,
      );
    });
  });

  describe('findOne', () => {
    it('should return a policy', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${GetPolicy}`],
            resources: ['*'],
          },
        ],
      };
      await expect(policyController.findOne('foo', request)).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });

      expect(policyService.findOne).toHaveBeenCalledWith('foo', request.user);
    });
  });

  describe('findAll', () => {
    it('should return an array of policies', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${ListPolicies}`],
            resources: ['*'],
          },
        ],
      };
      await expect(policyController.findAll(request)).resolves.toEqual([
        {
          _id: new Types.ObjectId('000000000000'),
          name: 'Foo',
          effect: Effect.Allow,
          actions: ['Foo:Action'],
          resources: ['*'],
        },
        {
          _id: new Types.ObjectId('000000000001'),
          name: 'Bar',
          effect: Effect.Allow,
          actions: ['Bar:Action'],
          resources: ['*'],
        },
      ]);

      expect(policyService.findAll).toHaveBeenCalledWith(request.user);
    });
  });

  describe('update', () => {
    it('should update a policy', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${UpdatePolicy}`],
            resources: ['*'],
          },
        ],
      };
      const updatePolicyDto = {
        name: 'Bar',
        effect: Effect.Deny,
        actions: ['Bar:Action'],
        resources: ['000000000000'],
      };
      await expect(
        policyController.update('000000000000', updatePolicyDto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Bar',
        effect: Effect.Deny,
        actions: ['Bar:Action'],
        resources: ['000000000000'],
      });

      expect(policyService.update).toHaveBeenCalledWith(
        '000000000000',
        updatePolicyDto,
        request.user,
      );
    });
  });

  describe('remove', () => {
    it('should remove a policy', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${PolicyScope}:${RemovePolicy}`],
            resources: ['*'],
          },
        ],
      };
      policyController.remove('000000000000', request);
      expect(policyService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
      );
    });
  });
});

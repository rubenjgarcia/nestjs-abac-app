import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PolicyController } from './policy.controller';
import { PolicyService } from '../services/policy.service';
import { Effect } from '../schemas/policy.schema';
import { CreatePolicyDto } from '../dtos/policies';

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
      await expect(policyController.create(policyCreateDto)).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });
      expect(policyService.create).toHaveBeenCalledWith(policyCreateDto);
    });
  });

  describe('findOne', () => {
    it('should return a policy', async () => {
      await expect(policyController.findOne('foo')).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
        effect: Effect.Allow,
        actions: ['Foo:Action'],
        resources: ['*'],
      });

      expect(policyService.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of policys', async () => {
      await expect(policyController.findAll()).resolves.toEqual([
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

      expect(policyService.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a policy', async () => {
      await expect(
        policyController.update('000000000000', {
          name: 'Bar',
          effect: Effect.Deny,
          actions: ['Bar:Action'],
          resources: ['000000000000'],
        }),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Bar',
        effect: Effect.Deny,
        actions: ['Bar:Action'],
        resources: ['000000000000'],
      });

      expect(policyService.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a policy', async () => {
      policyController.remove('000000000000');
      expect(policyService.remove).toHaveBeenCalled();
    });
  });
});

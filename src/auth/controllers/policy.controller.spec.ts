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
          },
        },
      ],
    }).compile();

    policyService = module.get<PolicyService>(PolicyService);
    policyController = module.get<PolicyController>(PolicyController);
  });

  describe('create', () => {
    it('should create a policy', async () => {
      expect(policyController.create(policyCreateDto)).resolves.toEqual({
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
      expect(policyController.findOne('foo')).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });

      expect(policyService.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of policys', async () => {
      expect(policyController.findAll()).resolves.toEqual([
        {
          _id: new Types.ObjectId('000000000000'),
          email: 'foo',
          password: 'bar',
        },
        {
          _id: new Types.ObjectId('000000000001'),
          email: 'foo2',
          password: 'bar2',
        },
      ]);

      expect(policyService.findAll).toHaveBeenCalled();
    });
  });
});

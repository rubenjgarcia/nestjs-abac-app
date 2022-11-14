import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { GroupController } from './groups.controller';
import { GroupService } from './groups.service';
import { CreateGroupDto } from './dtos/create-group.dto';
import { UpdateGroupDto } from './dtos/update-group.dto';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateGroup,
  GetGroup,
  ListGroups,
  GroupScope,
  RemoveGroup,
  UpdateGroup,
} from './groups.actions';

describe('GroupController', () => {
  let groupController: GroupController;
  let groupService: GroupService;

  const createGroupDto: CreateGroupDto = { name: 'FooGroup' };
  const updateGroupDto: UpdateGroupDto = { name: 'BarGroup' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        CaslAbilityFactory,
        {
          provide: GroupService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            findAll: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId('000000000000'),
              },
              {
                _id: new Types.ObjectId('000000000001'),
              },
            ]),
            create: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            update: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
            }),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    groupService = module.get<GroupService>(GroupService);
    groupController = module.get<GroupController>(GroupController);
  });

  describe('create', () => {
    it('should create a group', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${CreateGroup}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await groupController.create(createGroupDto, request);
      expect(groupService.create).toHaveBeenCalledWith(
        createGroupDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('findOne', () => {
    it('should return a group', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${GetGroup}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await groupController.findOne('foo', request);
      expect(groupService.findOne).toHaveBeenCalledWith(
        'foo',
        request.user,
        '000000000000',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${ListGroups}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await groupController.findAll(request);
      expect(groupService.findAll).toHaveBeenCalledWith(
        request.user,
        '000000000000',
      );
    });
  });

  describe('update', () => {
    it('should update a group', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${UpdateGroup}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await groupController.update('000000000000', updateGroupDto, request);
      expect(groupService.update).toHaveBeenCalledWith(
        '000000000000',
        updateGroupDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('remove', () => {
    it('should remove a group', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${GroupScope}:${RemoveGroup}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      groupController.remove('000000000000', request);
      expect(groupService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
        '000000000000',
      );
    });
  });
});

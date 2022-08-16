import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { GroupController } from './groups.controller';
import { GroupService } from './groups.service';
import { Effect } from '../../framework/factories/casl-ability.factory';
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        {
          provide: GroupService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'FooGroup',
            }),
            findAll: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId('000000000000'),
                name: 'FooGroup',
              },
              {
                _id: new Types.ObjectId('000000000001'),
                name: 'BarGroup',
              },
            ]),
            create: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'FooGroup',
            }),
            update: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'FooGroup',
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
      };
      await expect(
        groupController.create({ name: 'FooGroup' }, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'FooGroup',
      });
      expect(groupService.create).toHaveBeenCalledWith(
        { name: 'FooGroup' },
        request.user,
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
      };
      await expect(groupController.findOne('foo', request)).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'FooGroup',
      });

      expect(groupService.findOne).toHaveBeenCalledWith('foo', request.user);
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
      };
      await expect(groupController.findAll(request)).resolves.toEqual([
        {
          _id: new Types.ObjectId('000000000000'),
          name: 'FooGroup',
        },
        {
          _id: new Types.ObjectId('000000000001'),
          name: 'BarGroup',
        },
      ]);

      expect(groupService.findAll).toHaveBeenCalledWith(request.user);
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
      };
      const updateGroupDto = { name: 'FooGroup' };
      await expect(
        groupController.update('000000000000', updateGroupDto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'FooGroup',
      });

      expect(groupService.update).toHaveBeenCalledWith(
        '000000000000',
        updateGroupDto,
        request.user,
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
      };
      groupController.remove('000000000000', request);
      expect(groupService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
      );
    });
  });
});

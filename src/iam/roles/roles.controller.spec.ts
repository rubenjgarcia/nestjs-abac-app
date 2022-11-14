import { Test } from '@nestjs/testing';
import * as mocks from 'node-mocks-http';
import { RoleController } from './roles.controller';
import { RoleService } from './roles.service';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateRole,
  GetRole,
  ListRoles,
  RoleScope,
  RemoveRole,
  UpdateRole,
  RemoveRoleFromUser,
} from './roles.actions';

describe('RoleController', () => {
  let roleController: RoleController;
  let roleService: RoleService;

  const createRoleDto: CreateRoleDto = { name: 'FooRole' };
  const updateRoleDto: UpdateRoleDto = { name: 'BarRole' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        CaslAbilityFactory,
        {
          provide: RoleService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addRoleToUser: jest.fn(),
            removeRoleFromUser: jest.fn(),
          },
        },
      ],
    }).compile();

    roleService = module.get<RoleService>(RoleService);
    roleController = module.get<RoleController>(RoleController);
  });

  describe('create', () => {
    it('should create a role', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${CreateRole}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.create(createRoleDto, request);
      expect(roleService.create).toHaveBeenCalledWith(
        createRoleDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('findOne', () => {
    it('should return a role', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${GetRole}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.findOne('foo', request);
      expect(roleService.findOne).toHaveBeenCalledWith(
        'foo',
        request.user,
        '000000000000',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${ListRoles}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.findAll(request);
      expect(roleService.findAll).toHaveBeenCalledWith(
        request.user,
        '000000000000',
      );
    });
  });

  describe('update', () => {
    it('should update a role', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${UpdateRole}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.update('000000000000', updateRoleDto, request);
      expect(roleService.update).toHaveBeenCalledWith(
        '000000000000',
        updateRoleDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('remove', () => {
    it('should remove a role', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.remove('000000000000', request);
      expect(roleService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
        '000000000000',
      );
    });
  });

  describe('addRoleToUser', () => {
    it('should be able to add a role to an user', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRole}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.addRoleToUser(
        '000000000002',
        '000000000001',
        request,
      );
      expect(roleService.addRoleToUser).toHaveBeenCalledWith(
        '000000000002',
        '000000000001',
        request.user,
        '000000000000',
      );
    });
  });

  describe('removeRoleFromUser', () => {
    it('should be able to remove a role from an user', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${RoleScope}:${RemoveRoleFromUser}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await roleController.removeRoleFromUser(
        '000000000002',
        '000000000001',
        request,
      );
      expect(roleService.removeRoleFromUser).toHaveBeenCalledWith(
        '000000000002',
        '000000000001',
        request.user,
        '000000000000',
      );
    });
  });
});

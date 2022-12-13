import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { User } from './users.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateUser,
  GetUser,
  ListUsers,
  RemoveUser,
  UpdateUser,
  UserScope,
  Activate2FA,
} from './users.actions';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  const userCreateDto: CreateUserDto = {
    email: 'foo',
    password: 'bar',
  };

  const user: User = {
    _id: new Types.ObjectId('000000000000'),
    email: 'foo',
    password: 'bar',
    unit: {
      _id: new Types.ObjectId('000000000000'),
      name: 'FooUnit',
      organization: {
        _id: new Types.ObjectId('000000000000'),
        name: 'FooOrganization',
      },
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        CaslAbilityFactory,
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              email: 'foo',
              password: 'bar',
            }),
            findAll: jest.fn().mockResolvedValue([
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
            ]),
            create: jest.fn().mockResolvedValue(user),
            update: jest.fn().mockResolvedValue(user),
            remove: jest.fn(),
            generate2FA: jest.fn().mockResolvedValue('http://foo.bar'),
            validate2FA: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userController = module.get<UserController>(UserController);
  });

  describe('create', () => {
    it('should create an user', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${CreateUser}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      userController.create(userCreateDto, request);
      expect(userService.create).toHaveBeenCalledWith(
        userCreateDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('findOne', () => {
    it('should return an user', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${GetUser}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await expect(
        userController.findOne('000000000000', request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });

      expect(userService.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${ListUsers}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      await expect(userController.findAll(request)).resolves.toEqual([
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

      expect(userService.findAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an user', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UserScope}:${UpdateUser}`],
            resources: ['*'],
          },
        ],
        unitId: '000000000000',
      };
      const updateUserDto: UpdateUserDto = { policies: [] };
      userController.update('000000000000', updateUserDto, request);

      expect(userService.update).toHaveBeenCalledWith(
        '000000000000',
        updateUserDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('remove', () => {
    const request = mocks.createRequest();
    request.user = {
      policies: [
        {
          name: 'FooPolicy',
          effect: Effect.Allow,
          actions: [`${UserScope}:${RemoveUser}`],
          resources: ['*'],
        },
      ],
      unitId: '000000000000',
    };
    it('should remove an user', async () => {
      userController.remove('000000000000', request);
      expect(userService.remove).toHaveBeenCalled();
    });
  });

  describe('generate2FA', () => {
    const request = mocks.createRequest();
    const response = mocks.createResponse();
    request.user = {
      policies: [
        {
          name: 'FooPolicy',
          effect: Effect.Allow,
          actions: [`${UserScope}:${Activate2FA}`],
          resources: ['*'],
        },
      ],
      unitId: '000000000000',
    };

    it('should generate 2FA to an user', async () => {
      await userController.generate2FA(request, response);
      expect(userService.generate2FA).toHaveBeenCalled();
    });
  });

  describe('validate2FA', () => {
    const request = mocks.createRequest();
    request.user = {
      policies: [
        {
          name: 'FooPolicy',
          effect: Effect.Allow,
          actions: [`${UserScope}:${Activate2FA}`],
          resources: ['*'],
        },
      ],
      unitId: '000000000000',
    };

    it('should validate 2FA to an user', async () => {
      userController.validate2FA({ token: '123456' }, request);
      expect(userService.validate2FA).toHaveBeenCalled();
    });
  });
});

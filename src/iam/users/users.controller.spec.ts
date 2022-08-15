import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { User } from './users.schema';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateUser,
  GetUser,
  ListUsers,
  RemoveUser,
  UpdateUser,
  UserScope,
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
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
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
      };
      await expect(
        userController.create(userCreateDto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });
      expect(userService.create).toHaveBeenCalledWith(
        userCreateDto,
        request.user,
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
      };
      const updateUserDto: UpdateUserDto = { policies: [] };
      await expect(
        userController.update('000000000000', updateUserDto, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });

      expect(userService.update).toHaveBeenCalledWith(
        '000000000000',
        updateUserDto,
        request.user,
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
    };
    it('should remove an user', async () => {
      userController.remove('000000000000', request);
      expect(userService.remove).toHaveBeenCalled();
    });
  });
});

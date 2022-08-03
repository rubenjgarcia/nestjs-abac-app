import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dtos/users';

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
      expect(userController.create(userCreateDto)).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });
      expect(userService.create).toHaveBeenCalledWith(userCreateDto);
    });
  });

  describe('findOne', () => {
    it('should return an user', async () => {
      expect(userController.findOne('000000000000')).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });

      expect(userService.findOne).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      expect(userController.findAll()).resolves.toEqual([
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
      expect(
        userController.update('000000000000', { policies: [] }),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        email: 'foo',
        password: 'bar',
      });

      expect(userService.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove an user', async () => {
      userController.remove('000000000000');
      expect(userService.remove).toHaveBeenCalled();
    });
  });
});

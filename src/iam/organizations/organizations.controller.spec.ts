import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as mocks from 'node-mocks-http';
import { OrganizationController } from './organizations.controller';
import { OrganizationService } from './organizations.service';
import {
  CaslAbilityFactory,
  Effect,
} from '../../framework/factories/casl-ability.factory';
import {
  CreateOrganization,
  GetOrganization,
  ListOrganizations,
  OrganizationScope,
  RemoveOrganization,
  UpdateOrganization,
} from './organizations.actions';

describe('OrganizationController', () => {
  let organizationController: OrganizationController;
  let organizationService: OrganizationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        CaslAbilityFactory,
        {
          provide: OrganizationService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Foo',
            }),
            findAll: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId('000000000000'),
                name: 'Foo',
              },
              {
                _id: new Types.ObjectId('000000000001'),
                name: 'Bar',
              },
            ]),
            create: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Foo',
            }),
            update: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId('000000000000'),
              name: 'Bar',
            }),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    organizationService = module.get<OrganizationService>(OrganizationService);
    organizationController = module.get<OrganizationController>(
      OrganizationController,
    );
  });

  describe('create', () => {
    it('should create a organization', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${CreateOrganization}`],
            resources: ['*'],
          },
        ],
      };
      await expect(
        organizationController.create({ name: 'Foo' }, request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
      });
      expect(organizationService.create).toHaveBeenCalledWith(
        { name: 'Foo' },
        request.user,
      );
    });
  });

  describe('findOne', () => {
    it('should return a organization', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${GetOrganization}`],
            resources: ['*'],
          },
        ],
      };
      await expect(
        organizationController.findOne('foo', request),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Foo',
      });

      expect(organizationService.findOne).toHaveBeenCalledWith(
        'foo',
        request.user,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of organizations', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${ListOrganizations}`],
            resources: ['*'],
          },
        ],
      };
      await expect(organizationController.findAll(request)).resolves.toEqual([
        {
          _id: new Types.ObjectId('000000000000'),
          name: 'Foo',
        },
        {
          _id: new Types.ObjectId('000000000001'),
          name: 'Bar',
        },
      ]);

      expect(organizationService.findAll).toHaveBeenCalledWith(request.user);
    });
  });

  describe('update', () => {
    it('should update a organization', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${UpdateOrganization}`],
            resources: ['*'],
          },
        ],
      };
      const updateOrganizationDto = { name: 'Bar' };
      await expect(
        organizationController.update(
          '000000000000',
          updateOrganizationDto,
          request,
        ),
      ).resolves.toEqual({
        _id: new Types.ObjectId('000000000000'),
        name: 'Bar',
      });

      expect(organizationService.update).toHaveBeenCalledWith(
        '000000000000',
        updateOrganizationDto,
        request.user,
      );
    });
  });

  describe('remove', () => {
    it('should remove a organization', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${OrganizationScope}:${RemoveOrganization}`],
            resources: ['*'],
          },
        ],
      };
      organizationController.remove('000000000000', request);
      expect(organizationService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
      );
    });
  });
});

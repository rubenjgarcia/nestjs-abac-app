import { Test } from '@nestjs/testing';
import * as mocks from 'node-mocks-http';
import { UnitController } from './units.controller';
import { UnitService } from './units.service';
import { CreateUnitDto } from './dtos/create-unit.dto';
import { UpdateUnitDto } from './dtos/update-unit.dto';
import { Effect } from '../../framework/factories/casl-ability.factory';
import {
  CreateUnit,
  GetUnit,
  ListUnits,
  UnitScope,
  RemoveUnit,
  UpdateUnit,
  CreateChildUnit,
} from './units.actions';

describe('UnitController', () => {
  let unitController: UnitController;
  let unitService: UnitService;

  const createUnitDto: CreateUnitDto = { name: 'Foo' };
  const updateUnitDto: UpdateUnitDto = { name: 'Bar' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UnitController],
      providers: [
        {
          provide: UnitService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            createChildUnit: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    unitService = module.get<UnitService>(UnitService);
    unitController = module.get<UnitController>(UnitController);
  });

  describe('create', () => {
    it('should create a unit', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateUnit}`],
            resources: ['*'],
          },
        ],
        organizationId: '000000000000',
      };
      await unitController.create(createUnitDto, request);
      expect(unitService.create).toHaveBeenCalledWith(
        createUnitDto,
        request.user,
        '000000000000',
      );
    });
  });

  describe('findOne', () => {
    it('should return a unit', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${GetUnit}`],
            resources: ['*'],
          },
        ],
      };
      await unitController.findOne('foo', request);
      expect(unitService.findOne).toHaveBeenCalledWith('foo', request.user);
    });
  });

  describe('findAll', () => {
    it('should return an array of units', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${ListUnits}`],
            resources: ['*'],
          },
        ],
      };
      await unitController.findAll(request);
      expect(unitService.findAll).toHaveBeenCalledWith(request.user);
    });
  });

  describe('update', () => {
    it('should update a unit', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${UpdateUnit}`],
            resources: ['*'],
          },
        ],
      };
      unitController.update('000000000000', updateUnitDto, request);
      expect(unitService.update).toHaveBeenCalledWith(
        '000000000000',
        updateUnitDto,
        request.user,
      );
    });
  });

  describe('remove', () => {
    it('should remove a unit', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${RemoveUnit}`],
            resources: ['*'],
          },
        ],
      };
      await unitController.remove('000000000000', request);
      expect(unitService.remove).toHaveBeenCalledWith(
        '000000000000',
        request.user,
      );
    });
  });

  describe('createChildUnit', () => {
    it('should create a child unit', async () => {
      const request = mocks.createRequest();
      request.user = {
        policies: [
          {
            name: 'FooPolicy',
            effect: Effect.Allow,
            actions: [`${UnitScope}:${CreateChildUnit}`],
            resources: ['*'],
          },
        ],
        organizationId: '000000000000',
        unitId: '000000000001',
      };
      await unitController.createChildUnit(createUnitDto, request);
      expect(unitService.create).toHaveBeenCalledWith(
        createUnitDto,
        request.user,
        '000000000000',
        '000000000001',
      );
    });
  });
});

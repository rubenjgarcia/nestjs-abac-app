import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Ability } from '@casl/ability';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public-route.decorator';
import { CaslAbilityFactory } from '../factories/casl-ability.factory';
import { IPolicyHandler } from '../handler-definition';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const policyHandlers = this.reflector.get<IPolicyHandler[]>(
      CHECK_POLICIES_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();
    const ability = this.caslAbilityFactory.createWithPolicies(request.user);

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability, request.params),
    );
  }

  private execPolicyHandler(
    handler: IPolicyHandler,
    ability: Ability,
    params: unknown,
  ) {
    return handler.handle(ability, params);
  }
}

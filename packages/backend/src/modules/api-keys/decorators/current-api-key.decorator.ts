import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentApiKey = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const apiKey = request.apiKey;

    return data ? apiKey?.[data] : apiKey;
  },
);

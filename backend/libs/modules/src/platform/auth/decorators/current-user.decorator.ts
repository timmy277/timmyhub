import type { ExecutionContext } from '@nestjs/common'
import { createParamDecorator } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthUser } from '../interfaces/index'

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest<Request>()
    return request.user
})

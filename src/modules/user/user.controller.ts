import type { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';

export class UserController {
  constructor(private service: UserService) {}

  async createUser(req: Request, res: Response) {
    const { username } = req.body;
    const user = await this.service.createUser(username);
    res
      .status(statusCode.created)
      .json({ message: 'User created', data: user });
  }

  async getUser(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res
        .status(statusCode.badRequest)
        .json({ message: 'Invalid user id' });
    }

    const user = await this.service.getUserById(id);
    if (!user) {
      return res
        .status(statusCode.notFound)
        .json({ message: 'User not found' });
    }
    return res
      .status(statusCode.success)
      .json({ message: 'User retrieved', data: user });
  }
}

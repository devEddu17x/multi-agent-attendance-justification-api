import { INestApplication } from '@nestjs/common';
import { authenticateUser } from './authenticate-user.helper';
import { App } from 'supertest/types';

export const getAdminToken = async (app: INestApplication<App>) => {
  const { BASE_ADMIN_EMAIL, BASE_ADMIN_PASSWORD } = process.env;
  const adminToken = await authenticateUser(
    app,
    BASE_ADMIN_EMAIL!,
    BASE_ADMIN_PASSWORD!,
  );
  return adminToken ?? '';
};

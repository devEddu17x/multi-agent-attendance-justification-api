import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AdministrationService } from 'src/modules/admin/admin.service';
import { CreateParentDTO } from 'src/common/dtos/create-parent.dto';
import { getRandomCreateParentDTO } from '../factories/parent-random.dto';
import { ParentEntity } from 'src/modules/parents/entities/parent.entity';

export const getParentEntity = async (
  app: INestApplication<App>,
  dto?: CreateParentDTO,
): Promise<ParentEntity> => {
  const administrationService = app.get(AdministrationService);
  const { parent } = await administrationService.createParent(
    dto ?? getRandomCreateParentDTO(),
  );
  return parent;
};

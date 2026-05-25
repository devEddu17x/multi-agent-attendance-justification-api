import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateTeacherDTO } from 'src/common/dtos/create-teacher.dto';
import { TeachersService } from '../teachers/teachers.service';
import { CognitoService } from '../auth/services/cognito.service';
import { maskEmail } from 'src/utils/mask-email.util';
import { CognitoUserParams } from '../auth/interfaces/cognito-user.interface';
import { UserService } from '../user/user.service';
import { CreateParentDto } from '../../common/dtos/create-parent.dto';
import { ParentService } from '../parents/parent.service';

@Injectable()
export class AdministrationService {
  private readonly logger = new Logger(AdministrationService.name);
  constructor(
    private readonly cognitoService: CognitoService,
    private readonly userService: UserService,
    private readonly teachersService: TeachersService,
    private readonly parentService: ParentService,
  ) {}
  async createTeacher(dto: CreateTeacherDTO) {
    try {
      const params: CognitoUserParams = {
        email: dto.user.email,
        password: dto.password,
        firstName: dto.user.firstName,
        lastName: dto.user.lastName,
      };
      const cognitoUser = await this.cognitoService.signUpUser(params);
      const appUser = await this.userService.createUser(dto.user);
      const teacher = await this.teachersService.create({
        ...dto,
        userId: appUser.id,
      });
      return { teacher, cognitoUser };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(
        `Failed to create teacher with email ${maskEmail(dto.user.email)}`,
        error,
      );
      throw new InternalServerErrorException(
        'Unable to create teacher. Please try again later.',
      );
    }
  }

  async createParent(dto: CreateParentDto) {
    try {
      const params: CognitoUserParams = {
        email: dto.user.email,
        password: dto.password,
        firstName: dto.user.firstName,
        lastName: dto.user.lastName,
      };
      const cognitoUser = await this.cognitoService.signUpUser(params);
      const appUser = await this.userService.createUser(dto.user);
      const teacher = await this.parentService.create({
        ...dto,
        userId: appUser.id,
      });
      return { teacher, cognitoUser };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(
        `Failed to create parent with email ${maskEmail(dto.user.email)}`,
        error,
      );
      throw new InternalServerErrorException(
        'Unable to create parent. Please try again later.',
      );
    }
  }
}

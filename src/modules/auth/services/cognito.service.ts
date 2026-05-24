import {
    AdminAddUserToGroupCommand,
    AdminDeleteUserCommand,
    AdminDisableUserCommand,
    AdminEnableUserCommand,
    AdminRemoveUserFromGroupCommand,
    CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { maskEmail } from '../../../utils/mask-email.util';
import { ConfigService } from '@nestjs/config';
import { ROLES } from 'src/common/enums/roles.enum';

@Injectable()
export class CognitoService {
    private readonly logger = new Logger(CognitoService.name);

    private cognitoClient: CognitoIdentityProviderClient;
    private userPoolId: string;

    constructor(private readonly configService: ConfigService) {
        const cognitoConfig = configService.get('cognito');
        this.userPoolId = cognitoConfig.userPoolId;
        this.cognitoClient = new CognitoIdentityProviderClient({
            region: cognitoConfig.region,
        });
    }

    async addRole(email: string, role: ROLES) {
        try {
            const command = new AdminAddUserToGroupCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                GroupName: role,
            });
            await this.cognitoClient.send(command);
        } catch (error: any) {
            if (error.name === 'UserNotFoundException')
                throw new NotFoundException('User does not exist');
            if (error.name === 'ResourceNotFoundException')
                throw new BadRequestException(`Role ${role} does not exist`);
            this.logger.error(
                { err: error, email: maskEmail(email), role },
                'Failed to assign role to user',
            );
            throw new InternalServerErrorException('Could not assign role');
        }
    }

    async removeRole(email: string, role: ROLES) {
        try {
            const command = new AdminRemoveUserFromGroupCommand({
                UserPoolId: this.userPoolId,
                Username: email,
                GroupName: role,
            });
            await this.cognitoClient.send(command);
        } catch (error: any) {
            if (error.name === 'UserNotFoundException')
                throw new NotFoundException('User does not exist');
            if (error.name === 'UserNotInGroupException')
                throw new BadRequestException(`User does not have role ${role}`);
            this.logger.error(
                { err: error, email: maskEmail(email), role },
                'Failed to revoke role from user',
            );
            throw new InternalServerErrorException('Could not revoke role');
        }
    }

    async disableUser(email: string) {
        try {
            const command = new AdminDisableUserCommand({
                UserPoolId: this.userPoolId,
                Username: email,
            });
            await this.cognitoClient.send(command);
        } catch (error: any) {
            if (error.name === 'UserNotFoundException') {
                throw new NotFoundException('User does not exist');
            }
            this.logger.error(
                { err: error, email: maskEmail(email) },
                'Failed to disable user in Cognito',
            );
            throw new InternalServerErrorException('Could not disable user');
        }
    }

    async enableUser(email: string) {
        try {
            const command = new AdminEnableUserCommand({
                UserPoolId: this.userPoolId,
                Username: email,
            });
            await this.cognitoClient.send(command);
        } catch (error: any) {
            if (error.name === 'UserNotFoundException') {
                throw new NotFoundException('User does not exist.');
            }
            this.logger.error(
                { err: error, email: maskEmail(email) },
                'Failed to enable user in Cognito',
            );
            throw new InternalServerErrorException('Could not enable user');
        }
    }

    async deleteUser(email: string) {
        try {
            const command = new AdminDeleteUserCommand({
                UserPoolId: this.userPoolId,
                Username: email,
            });
            await this.cognitoClient.send(command);
            return { success: true };
        } catch (error: any) {
            const maskedEmail = maskEmail(email);

            this.logger.error(
                { err: error, email: maskedEmail },
                'Critical Rollback Failure: Could not delete user from Cognito',
            );

            return { success: false, error };
        }
    }
}

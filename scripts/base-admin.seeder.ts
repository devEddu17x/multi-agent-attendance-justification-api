import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroup$,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DataSource } from 'typeorm';
import { UserEntity } from '../src/modules/user/entities/user.entity';
import { TeacherEntity } from '../src/modules/teachers/entities/teacher.entity';
import { ParentEntity } from '../src/modules/parents/entities/parent.entity';
import { CourseEntity } from '../src/modules/courses/entities/course.entity';
import { TeacherCourseEntity } from '../src/modules/teachers/entities/teacher-course.entity';
import { ROLES } from 'src/common/enums/roles.enum';

const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'AWS_COGNITO_USER_POOL_ID',
  'AWS_COGNITO_REGION',
  'BASE_ADMIN_EMAIL',
  'BASE_ADMIN_PASSWORD',
  'BASE_ADMIN_FIRST_NAME',
  'BASE_ADMIN_LAST_NAME',
] as const;

function loadEnv() {
  const envFile = process.env.SEED_ENV_FILE || '.env.seed';
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envFile });
  } catch (error) {
    console.log(
      `[Warning] Could not load ${envFile}, falling back to process.env. Error:`,
      error,
    );
  }

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function createCognitoUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  let userExisted = false;

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: `${firstName} ${lastName}` },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
        MessageAction: 'SUPPRESS',
      }),
    );

    console.log(`[Cognito] User created: ${email}`);

    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: ROLES.ADMIN,
      }),
    );

    console.log(`[Cognito] User added to group ${ROLES.ADMIN}: ${email}`);
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      userExisted = true;
      console.log(`[Cognito] User already exists: ${email}`);
    } else {
      throw error;
    }
  }

  if (!userExisted) {
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );
    console.log(`[Cognito] Password set permanently for: ${email}`);
  }
}

async function createDatabaseUser(
  dataSource: DataSource,
  email: string,
  firstName: string,
  lastName: string,
) {
  const existing = await dataSource.getRepository(UserEntity).findOne({
    where: { email },
  });

  if (existing) {
    console.log(`[Database] User already exists: ${email}`);
    return;
  }

  const user = new UserEntity();
  user.email = email;
  user.firstName = firstName;
  user.lastName = lastName;
  user.isAdmin = true;

  await dataSource.getRepository(UserEntity).save(user);
  console.log(`[Database] Admin user created: ${email}`);
}

async function main() {
  loadEnv();

  const {
    DB_HOST,
    DB_PORT,
    DB_USERNAME,
    DB_PASSWORD,
    DB_NAME,
    DB_SSL,
    AWS_COGNITO_USER_POOL_ID,
    AWS_COGNITO_REGION,
    BASE_ADMIN_EMAIL,
    BASE_ADMIN_PASSWORD,
    BASE_ADMIN_FIRST_NAME,
    BASE_ADMIN_LAST_NAME,
  } = process.env;

  const cognitoClient = new CognitoIdentityProviderClient({
    region: AWS_COGNITO_REGION,
  });

  const dataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: Number(DB_PORT),
    username: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [
      UserEntity,
      TeacherEntity,
      ParentEntity,
      CourseEntity,
      TeacherCourseEntity,
    ],
  });

  try {
    await dataSource.initialize();
    console.log('[Database] Connected');

    await createCognitoUser(
      cognitoClient,
      AWS_COGNITO_USER_POOL_ID!,
      BASE_ADMIN_EMAIL!,
      BASE_ADMIN_PASSWORD!,
      BASE_ADMIN_FIRST_NAME!,
      BASE_ADMIN_LAST_NAME!,
    );

    await createDatabaseUser(
      dataSource,
      BASE_ADMIN_EMAIL!,
      BASE_ADMIN_FIRST_NAME!,
      BASE_ADMIN_LAST_NAME!,
    );

    console.log('[Seed] Base admin user provisioning complete');
  } catch (error) {
    console.error('[Seed] Failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    cognitoClient.destroy();
  }
}

main();

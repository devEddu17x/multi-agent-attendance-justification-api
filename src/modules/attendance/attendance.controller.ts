import {
  Controller,
  Put,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Query,
  Get,
  UseGuards,
  ParseDatePipe,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './services/attendance.service';
import { ImageValidationPipe } from './pipes/image-validation.pipe';
import {
  ApiDocRegisterStudentFace,
  ApiDocRegisterAttendance,
} from './docs/attendance.doc';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from 'src/common/enums/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from 'src/common/interfaces/user.interface';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Put(':id/rekognition')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiDocRegisterStudentFace()
  async updateRekognition(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageValidationPipe(150)) photo: Express.Multer.File,
  ) {
    return await this.attendanceService.registerStudentFace(id, photo);
  }

  @Roles(ROLES.ADMIN, ROLES.TEACHER)
  @Post('schedule')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiDocRegisterAttendance()
  async registerAttendance(
    @UploadedFile(ImageValidationPipe(50)) photo: Express.Multer.File,
    @Query('time', new ParseDatePipe({})) time?: Date,
  ) {
    console.log('time', time);
    const simulatedTime = time ? new Date(time) : undefined;
    console.log('simulatedTime', simulatedTime);
    return await this.attendanceService.registerAttendance(
      photo,
      simulatedTime,
    );
  }

  // @Roles(ROLES.PARENT)
  // @Get('parent')
  // async getAttendanceFromParentStudents(@CurrentUser() user: User) {
  //   return await this.attendanceService.getParentStudentAttendance(user.email);
  // }

  @Roles(ROLES.PARENT)
  @Get('parent/student/:id')
  async getAttendanceFromStudent(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.attendanceService.getParentStudentAttendanceByStudentId(
      user.sub,
      id,
    );
  }

  @Roles(ROLES.TEACHER)
  @Get('teacher/schedule/:id')
  async getAttendanceFromSchedule(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('time', new ParseDatePipe({ optional: true })) time?: Date,
  ) {
    return await this.attendanceService.getTeacherStudentsAttendanceBySchedule(
      user.sub,
      id,
      time,
    );
  }

  @Roles(ROLES.ADMIN)
  @Post('generate-absences')
  async generateAbsences(@Query('date') date: string) {
    return await this.attendanceService.generateAbsences(date);
  }
}

import {
  Controller,
  Put,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './services/attendance.service';
import { ImageValidationPipe } from './pipes/image-validation.pipe';
import {
  ApiDocRegisterStudentFace,
  ApiDocRegisterAttendance,
} from './docs/attendance.doc';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Put(':id/rekognition')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiDocRegisterStudentFace()
  async updateRekognition(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(ImageValidationPipe(150)) photo: Express.Multer.File,
  ) {
    return await this.attendanceService.registerStudentFace(id, photo);
  }

  @Post('schedule')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiDocRegisterAttendance()
  async registerAttendance(
    @UploadedFile(ImageValidationPipe(50)) photo: Express.Multer.File,
    @Query('time') time?: string,
  ) {
    console.log('time', time);
    const simulatedTime = time ? new Date(time) : undefined;
    console.log('simulatedTime', simulatedTime);
    return await this.attendanceService.registerAttendance(
      photo,
      simulatedTime,
    );
  }
}

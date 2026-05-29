import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

export const ImageValidationPipe = (maxSizeKb: number) => {
  return new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: maxSizeKb * 1024 }),
      new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png)/ }),
    ],
    fileIsRequired: true,
  });
};

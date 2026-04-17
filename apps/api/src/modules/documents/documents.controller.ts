import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import type { Response } from 'express';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateDocumentDto, DocumentsQueryDto } from './documents.dto.js';
import { DocumentsService } from './documents.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions('documents.read')
  findAll(
    @Query() query: DocumentsQueryDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.documentsService.findAll(query, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Post('upload')
  @RequirePermissions('documents.create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads');
          mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(safeName)}`);
        },
      }),
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.create(file, dto, user.sub);
  }

  @Get(':id/download')
  @RequirePermissions('documents.read')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { document, stream } = await this.documentsService.download(id);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    return new StreamableFile(stream);
  }
}

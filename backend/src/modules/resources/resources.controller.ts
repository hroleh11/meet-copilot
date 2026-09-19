import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '~/common/decorators';
import { MessageResponse } from '~/common/dto';
import {
  AddResourceDto,
  AddResourceTextDto,
  ListResourcesDto,
} from './dto/resources.dto';
import {
  ResourceContentResponse,
  ResourceLimitsResponse,
  ResourceResponse,
} from './dto/resources.responses';
import { ResourcesService } from './resources.service';
import { UPLOAD_SCHEMA } from './resources.upload';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Materials of one level, newest first' })
  @ApiOkResponse({ type: [ResourceResponse] })
  list(
    @GetCurrentUserId() userId: string,
    @Query() query: ListResourcesDto,
  ): Promise<ResourceResponse[]> {
    return this.resourcesService.list(userId, query);
  }

  @Get('limits')
  @ApiOperation({ summary: 'How large a file and how long a text may be' })
  @ApiOkResponse({ type: ResourceLimitsResponse })
  limits(): ResourceLimitsResponse {
    return this.resourcesService.limits();
  }

  @Post()
  @ApiOperation({
    summary: 'Upload a PDF, Markdown or text file as material',
    description:
      'Answers as soon as the bytes are accepted. Reading the document runs behind it, so the material arrives pending and turns ready or failed.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: UPLOAD_SCHEMA })
  @ApiCreatedResponse({ type: ResourceResponse })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @GetCurrentUserId() userId: string,
    @Body() dto: AddResourceDto,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    file: Express.Multer.File,
  ): Promise<ResourceResponse> {
    return this.resourcesService.addFile(userId, dto, {
      mimeType: file.mimetype,
      bytes: file.buffer,
    });
  }

  @Post('text')
  @ApiOperation({ summary: 'Add pasted text as material' })
  @ApiCreatedResponse({ type: ResourceResponse })
  addText(
    @GetCurrentUserId() userId: string,
    @Body() dto: AddResourceTextDto,
  ): Promise<ResourceResponse> {
    return this.resourcesService.addText(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One material, to follow it while it is being read' })
  @ApiOkResponse({ type: ResourceResponse })
  get(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceResponse> {
    return this.resourcesService.get(userId, resourceId);
  }

  @Get(':id/content')
  @ApiOperation({
    summary: 'What was read out of a material',
    description:
      'The extracted text, and the compressed version the model is given when the full text did not fit.',
  })
  @ApiOkResponse({ type: ResourceContentResponse })
  content(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceContentResponse> {
    return this.resourcesService.content(userId, resourceId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a material and the file behind it' })
  @ApiOkResponse({ type: MessageResponse })
  async remove(
    @GetCurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) resourceId: string,
  ): Promise<MessageResponse> {
    await this.resourcesService.remove(userId, resourceId);

    return { message: 'Done' };
  }
}

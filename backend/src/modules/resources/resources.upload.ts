import { ResourceScope } from '~/generated/prisma/enums';

export const UPLOAD_SCHEMA = {
  type: 'object',
  required: ['file', 'scope', 'name'],
  properties: {
    file: { type: 'string', format: 'binary' },
    scope: { type: 'string', enum: Object.values(ResourceScope) },
    name: { type: 'string' },
    projectId: { type: 'string', format: 'uuid' },
  },
};

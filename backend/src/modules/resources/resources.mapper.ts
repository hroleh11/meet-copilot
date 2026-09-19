import type { Resource } from '~/generated/prisma/client';
import type {
  ResourceContentResponse,
  ResourceResponse,
} from './dto/resources.responses';

export function toResourceResponse(resource: Resource): ResourceResponse {
  return {
    id: resource.id,
    scope: resource.scope,
    projectId: resource.projectId,
    meetingId: resource.meetingId,
    kind: resource.kind,
    name: resource.name,
    byteSize: resource.byteSize,
    status: resource.status,
    failure: resource.failure,
    createdAt: resource.createdAt,
  };
}

export function toContentResponse(resource: Resource): ResourceContentResponse {
  return {
    name: resource.name,
    text: resource.text,
    digest: resource.digest,
    chars: resource.chars,
  };
}

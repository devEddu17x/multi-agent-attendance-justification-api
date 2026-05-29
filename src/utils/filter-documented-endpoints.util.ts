import { OpenAPIObject } from '@nestjs/swagger';

export function filterDocumentedEndpoints(
  document: OpenAPIObject,
): OpenAPIObject {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (method === 'parameters') continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!operation.summary && !operation.description) {
        delete pathItem[method];
      }
    }
    if (Object.keys(pathItem).filter((k) => k !== 'parameters').length === 0) {
      delete document.paths[path];
    }
  }

  return document;
}

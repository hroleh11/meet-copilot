import { Global, Module } from '@nestjs/common';
import { ObjectStorage } from './object-storage';
import { R2ObjectStorage } from './r2-object-storage';

@Global()
@Module({
  providers: [{ provide: ObjectStorage, useClass: R2ObjectStorage }],
  exports: [ObjectStorage],
})
export class ObjectStorageModule {}

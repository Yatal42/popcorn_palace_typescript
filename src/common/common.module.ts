import { Module, Global } from '@nestjs/common';
import { AppLoggerService } from './services/logger.service';

@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () => {
        return new AppLoggerService();
      },
    },
  ],
  exports: [AppLoggerService],
})
export class CommonModule {}

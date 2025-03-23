import {
  Injectable,
  Logger,
  LoggerService as NestLoggerService,
} from '@nestjs/common';

@Injectable()
export class AppLoggerService extends Logger implements NestLoggerService {
  constructor(context?: string) {
    super(context || AppLoggerService.name);
  }

  logDatabaseError(error: any, operation: string, entity: string): void {
    const errorMessage = `Database error during ${operation} operation on ${entity}`;

    if (error.code) {
      this.error(
        `${errorMessage} - Code: ${error.code}, Detail: ${error.detail || 'No detail'}`,
        error.stack,
        entity,
      );
    } else {
      this.error(errorMessage, error.stack, entity);
    }
  }
}

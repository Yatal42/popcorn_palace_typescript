import {
  Injectable,
  Logger,
  LoggerService as NestLoggerService,
} from '@nestjs/common';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = new Logger(context || AppLoggerService.name);
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context);
  }

  // Helper method for logging database errors
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

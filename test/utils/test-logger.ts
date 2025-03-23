import { Logger } from '@nestjs/common';

export class TestLogger extends Logger {
  constructor(context?: string) {
    super(context || 'TestSuite');
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

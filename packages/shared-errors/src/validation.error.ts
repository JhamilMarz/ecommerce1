import { BaseError } from './base.error'

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message, 400)
  }
}

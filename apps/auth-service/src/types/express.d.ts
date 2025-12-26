declare namespace Express {
  export interface Request {
    correlationId?: string;
    user?: {
      userId: string;
      email: string;
      role: string;
    };
  }
}

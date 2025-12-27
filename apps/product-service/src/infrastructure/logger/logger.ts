import winston from 'winston';
import { config } from '../config/config';

const { combine, timestamp, json, printf, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json(),
  ),
  defaultMeta: { service: 'product-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (config.server.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
    }),
  );
}

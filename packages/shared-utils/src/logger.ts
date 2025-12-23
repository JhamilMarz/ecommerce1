export const createLogger = (serviceName: string) => {
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: 'info', service: serviceName, message, ...meta, timestamp: new Date() }))
    },
    error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
      console.error(JSON.stringify({ level: 'error', service: serviceName, message, error: error?.message, stack: error?.stack, ...meta, timestamp: new Date() }))
    },
    warn: (message: string, meta?: Record<string, unknown>) => {
      console.warn(JSON.stringify({ level: 'warn', service: serviceName, message, ...meta, timestamp: new Date() }))
    },
    debug: (message: string, meta?: Record<string, unknown>) => {
      console.debug(JSON.stringify({ level: 'debug', service: serviceName, message, ...meta, timestamp: new Date() }))
    }
  }
}

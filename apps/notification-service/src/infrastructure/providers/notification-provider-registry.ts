import { NotificationChannel } from '../../domain/value-objects/notification-channel'
import { NotificationProvider, NotificationProviderRegistry } from '../../application'

/**
 * Notification Provider Registry Implementation
 *
 * Manages provider instances and maps channels to providers.
 *
 * @remarks
 * - Singleton pattern recommended for application-wide registry
 * - Providers registered at application startup
 * - Thread-safe (Node.js single-threaded)
 */
export class NotificationProviderRegistryImpl implements NotificationProviderRegistry {
  private readonly providers: Map<NotificationChannel, NotificationProvider>

  constructor() {
    this.providers = new Map()
  }

  /**
   * Get provider for a specific channel
   *
   * @throws Error if no provider registered for channel
   */
  getProvider(channel: NotificationChannel): NotificationProvider {
    const provider = this.providers.get(channel)

    if (!provider) {
      throw new Error(`No provider registered for channel: ${channel}`)
    }

    return provider
  }

  /**
   * Register a provider for a channel
   *
   * @throws Error if provider already registered for channel
   */
  registerProvider(channel: NotificationChannel, provider: NotificationProvider): void {
    if (this.providers.has(channel)) {
      throw new Error(`Provider already registered for channel: ${channel}`)
    }

    // Validate provider supports the channel
    if (provider.getSupportedChannel() !== channel) {
      throw new Error(
        `Provider mismatch: trying to register provider for channel '${channel}' but provider supports '${provider.getSupportedChannel()}'`
      )
    }

    this.providers.set(channel, provider)
    console.log(`✅ Registered provider '${provider.getProviderName()}' for channel: ${channel}`)
  }

  /**
   * Check if a channel has a registered provider
   */
  hasProvider(channel: NotificationChannel): boolean {
    return this.providers.has(channel)
  }

  /**
   * Get all registered channels
   */
  getRegisteredChannels(): NotificationChannel[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Unregister provider for a channel
   *
   * Useful for testing or hot-reloading.
   */
  unregisterProvider(channel: NotificationChannel): boolean {
    const deleted = this.providers.delete(channel)

    if (deleted) {
      console.log(`✅ Unregistered provider for channel: ${channel}`)
    }

    return deleted
  }

  /**
   * Clear all registered providers
   *
   * Useful for testing or shutdown.
   */
  clearAll(): void {
    this.providers.clear()
    console.log('✅ Cleared all registered providers')
  }

  /**
   * Get count of registered providers
   */
  getProviderCount(): number {
    return this.providers.size
  }

  /**
   * Check if all providers are available
   */
  async areAllProvidersAvailable(): Promise<boolean> {
    const availabilityChecks = Array.from(this.providers.values()).map((provider) =>
      provider.isAvailable()
    )

    const results = await Promise.all(availabilityChecks)

    return results.every((isAvailable) => isAvailable)
  }

  /**
   * Get availability status for all providers
   */
  async getProviderStatuses(): Promise<
    Array<{ channel: NotificationChannel; provider: string; available: boolean }>
  > {
    const statuses: Array<{ channel: NotificationChannel; provider: string; available: boolean }> =
      []

    for (const [channel, provider] of this.providers.entries()) {
      const available = await provider.isAvailable()
      statuses.push({
        channel,
        provider: provider.getProviderName(),
        available,
      })
    }

    return statuses
  }
}

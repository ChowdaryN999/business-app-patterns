import type { DataSource } from './DataSource'

/**
 * Inside Power Apps (published, or `pa app run` Local Play) the app is framed by
 * the host and talks to the real connectors. Opened directly (`npm run dev`) there
 * is no host, so it runs on the in-memory source. `?mock` forces the mock anywhere.
 */
export async function createDataSource(): Promise<DataSource> {
  const hosted = window.self !== window.top
  if (!hosted || new URLSearchParams(location.search).has('mock')) {
    return (await import('./mock')).createMockDataSource()
  }
  return (await import('./power')).createPowerDataSource()
}

import { D1Database } from '@cloudflare/workers-types';
import { TournamentRow } from '../../functions/_shared/tournaments/repository';

export function createMockD1Database(): D1Database {
  const store = new Map<string, TournamentRow>();

  return {
    prepare(query: string) {
      let boundParams: any[] = [];
      return {
        bind(...args: any[]) {
          boundParams = args;
          return this;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes('SELECT') && query.includes('admin_token_hash = ?1')) {
            const hash = boundParams[0];
            for (const row of store.values()) {
              if (row.admin_token_hash === hash) {
                return (row as unknown) as T;
              }
            }
            return null;
          }

          if (query.includes('SELECT') && query.includes('public_id = ?1')) {
            const publicId = boundParams[0];
            for (const row of store.values()) {
              if (row.public_id === publicId) {
                return (row as unknown) as T;
              }
            }
            return null;
          }

          if (query.includes('UPDATE tournaments')) {
            // SET state_json = ?1, version = version + 1, updated_at = ?2 WHERE id = ?3 AND version = ?4 RETURNING version, updated_at
            const [stateJson, now, id, expectedVersion] = boundParams;
            const existing = store.get(id);
            if (!existing || existing.version !== expectedVersion) {
              return null;
            }

            const newVersion = existing.version + 1;
            existing.state_json = stateJson;
            existing.version = newVersion;
            existing.updated_at = now;
            store.set(id, existing);

            return ({ version: newVersion, updated_at: now } as unknown) as T;
          }

          return null;
        },
        async run() {
          if (query.includes('INSERT INTO tournaments')) {
            const [id, publicId, adminTokenHash, stateJson, now] = boundParams;
            const row: TournamentRow = {
              id,
              public_id: publicId,
              admin_token_hash: adminTokenHash,
              state_json: stateJson,
              version: 1,
              created_at: now,
              updated_at: now,
            };
            store.set(id, row);
          }
          return { success: true, meta: {} as any, results: [] };
        },
        async all<T = unknown>() {
          return { success: true, meta: {} as any, results: Array.from(store.values()) as unknown as T[] };
        },
        async raw() {
          return [];
        },
      };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    async batch() {
      return [];
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
  } as unknown as D1Database;
}

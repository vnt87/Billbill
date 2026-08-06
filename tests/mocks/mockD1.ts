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
          if (query.includes('SELECT') && query.includes('management_token_hash = ?1')) {
            const hash = boundParams[0];
            for (const row of store.values()) if (row.management_token_hash === hash) return (row as unknown) as T;
            return null;
          }

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
            if (query.includes('management_passphrase_hash')) {
              const [passphraseHash, managementTokenHash, id] = boundParams;
              const existing = store.get(id);
              if (!existing) return null;
              existing.management_passphrase_hash = passphraseHash;
              existing.management_token_hash = managementTokenHash;
              store.set(id, existing);
              return ({ success: true } as unknown) as T;
            }
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
          if (query.includes('UPDATE tournaments') && query.includes('management_passphrase_hash')) {
            const [passphraseHash, managementTokenHash, id] = boundParams;
            const existing = store.get(id);
            if (existing) {
              existing.management_passphrase_hash = passphraseHash;
              existing.management_token_hash = managementTokenHash;
              store.set(id, existing);
            }
            return { success: Boolean(existing), meta: {} as any, results: [] };
          }
          if (query.includes('INSERT INTO tournaments')) {
            const [id, publicId, adminTokenHash, managementPassphraseHash, managementTokenHash, stateJson, now] = boundParams;
            const row: TournamentRow = {
              id,
              public_id: publicId,
              admin_token_hash: adminTokenHash,
              management_passphrase_hash: managementPassphraseHash,
              management_token_hash: managementTokenHash,
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
          if (query.includes('json_extract')) {
            const rows = Array.from(store.values()).map((row) => {
              const agg = JSON.parse(row.state_json);
              return {
                id: row.id,
                public_id: row.public_id,
                name: agg.tournament.name,
                format: agg.tournament.format,
                status: agg.tournament.status,
                created_at: row.created_at,
                updated_at: row.updated_at,
              };
            });
            return { success: true, meta: {} as any, results: rows as unknown as T[] };
          }
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

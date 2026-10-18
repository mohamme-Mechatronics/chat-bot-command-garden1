import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { getCloudConfiguration } from './configuration';
let client: ReturnType<typeof createClient<Database>> | undefined;
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, property) {
    if (!client) {
      const { url, key } = getCloudConfiguration();
      if (!url || !key) throw new Error('إعدادات الاتصال غير مكتملة');
      client = createClient<Database>(url, key, { auth: { persistSession: true, autoRefreshToken: true }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (headers.get('Authorization') === `Bearer ${key}` && key.startsWith('sb_')) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
    }
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Client-Side Credential & Secret Safety', () => {
  it('does NOT expose Supabase service_role secret keys in browser environment configuration', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

    // Asserts only publishable anon key is documented in browser client env template
    expect(envExampleContent).toContain('VITE_SUPABASE_ANON_KEY');
    expect(envExampleContent).not.toContain('SERVICE_ROLE_KEY');
    expect(envExampleContent).not.toContain('service_role');
    expect(envExampleContent).not.toContain('SUPABASE_SECRET');
  });

  it('ensures supabase.ts client only accesses public VITE_ publishable variables', () => {
    const clientPath = path.resolve(__dirname, '../lib/supabase.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');

    expect(clientContent).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(clientContent).toContain('import.meta.env.VITE_SUPABASE_ANON_KEY');

    // Never reference secret service credentials in browser client
    expect(clientContent).not.toContain('service_role');
    expect(clientContent).not.toContain('SERVICE_ROLE_KEY');
    expect(clientContent).not.toContain('SUPABASE_KEY_SECRET');
  });
});

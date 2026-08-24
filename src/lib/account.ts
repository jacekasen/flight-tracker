import { Platform } from 'react-native';

import { loadFlights, type FlightRow } from '@/lib/flights';
import { getSupabase } from '@/lib/supabase';

type ExportProfile = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountExport = {
  schemaVersion: 1;
  exportedAt: string;
  profile: ExportProfile;
  flights: FlightRow[];
};

export class AccountDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountDataError';
  }
}

export function serializeAccountExport(data: AccountExport): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function buildAccountExport(): Promise<AccountExport> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new AccountDataError('Sign in again before exporting your data.');
  }

  const [{ data: profile, error: profileError }, flights] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    loadFlights(user.id),
  ]);
  if (profileError || !profile) {
    throw new AccountDataError('Could not load your profile for export.');
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile.full_name,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
    flights,
  };
}

export async function exportAccountData(): Promise<void> {
  const data = await buildAccountExport();
  const contents = serializeAccountExport(data);
  const filename = `flight-tracker-export-${data.exportedAt.slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }

  const [{ File, Paths }, Sharing] = await Promise.all([
    import('expo-file-system'),
    import('expo-sharing'),
  ]);
  if (!(await Sharing.isAvailableAsync())) {
    throw new AccountDataError('File sharing is not available on this device.');
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(contents);
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Export flight data',
    mimeType: 'application/json',
    UTI: 'public.json',
  });
}

export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    throw new AccountDataError(error.message || 'Could not delete your account.');
  }
  await supabase.auth.signOut({ scope: 'local' });
}

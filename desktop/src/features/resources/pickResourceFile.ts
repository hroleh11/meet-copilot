import { open } from '@tauri-apps/plugin-dialog';
import { uk } from '~/shared/i18n/uk';

const EXTENSIONS = ['pdf', 'md', 'markdown', 'txt'];

export async function pickResourceFile(): Promise<string | null> {
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [{ name: uk.resources.fileFilter, extensions: EXTENSIONS }],
  });

  return typeof picked === 'string' ? picked : null;
}

import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const webPkgPath = path.resolve(process.cwd(), 'package.json');
    const apiPkgPath = path.resolve(process.cwd(), '../api/package.json');
    const changelogPath = path.resolve(process.cwd(), '../../CHANGELOG_SESSION.md');

    let webVersion = '';
    let apiVersion = '';
    let changelog = '';

    try {
      const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf-8'));
      webVersion = webPkg?.version || '';
    } catch {}

    try {
      const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, 'utf-8'));
      apiVersion = apiPkg?.version || '';
    } catch {}

    try {
      if (fs.existsSync(changelogPath)) {
        changelog = fs.readFileSync(changelogPath, 'utf-8');
      } else {
        // Fallback: tentar um arquivo de changelog alternativo
        const alt = path.resolve(process.cwd(), '../../CHANGELOG.md');
        if (fs.existsSync(alt)) {
          changelog = fs.readFileSync(alt, 'utf-8');
        }
      }
    } catch {}

    res.status(200).json({
      webVersion,
      apiVersion,
      changelog,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Erro interno ao ler logs' });
  }
}

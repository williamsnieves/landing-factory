// The FTPS fallback for shared hosting without SSH: FTP over explicit TLS through `lftp`. TLS is forced for the
// control and data channels and the certificate is verified; plain FTP is refused. The password is read from
// DEPLOY_FTP_PASSWORD and handed to lftp through its environment (LFTP_PASSWORD with --env-password), never
// as an argument. Only the plan is tested here (no FTPS server in tests). Design: Decision 6.
import { checkRemotePath } from './config.mjs';

export const PASSWORD_VARIABLE = 'DEPLOY_FTP_PASSWORD';

/** Settings that make a transfer clear text; they never appear in a plan and are refused if asked for. */
export class PlainFtpRefused extends Error {}

/** The lftp script: TLS settings first, then one mirror of the staged build into the document root. */
export function lftpScript({ shared, staging }) {
  const path = checkRemotePath(
    shared.path,
    'shared.path',
    'shared',
    shared.allowPath ?? [],
  );
  return [
    'set ftp:ssl-force true',
    'set ftp:ssl-protect-data true',
    'set ftp:ssl-protect-list true',
    'set ssl:verify-certificate true',
    'set net:max-retries 2',
    'set net:timeout 30',
    `mirror --reverse --delete --verbose --exclude-glob .well-known/ "${staging.replace(/\/+$/, '')}" "${path}"`,
    'bye',
  ].join('; ');
}

/** The single step of an FTPS deploy. The staged build already holds the generated `.htaccess`. */
export function planFtps({ shared, staging }) {
  if (shared.protocol === 'ftp')
    throw new PlainFtpRefused(
      'plain FTP sends the password in clear text and is refused; use ftps (explicit TLS)',
    );
  return [
    {
      id: 'upload',
      title: `upload the build to ${shared.path}/ over FTP with explicit TLS (files not in the build are removed)`,
      argv: [
        'lftp',
        '--env-password',
        '-e',
        lftpScript({ shared, staging }),
        '-u',
        shared.user,
        `ftp://${shared.host}:${shared.port}`,
      ],
      envFrom: { LFTP_PASSWORD: PASSWORD_VARIABLE },
    },
  ];
}

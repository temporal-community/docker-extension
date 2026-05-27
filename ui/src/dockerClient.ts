import { createDockerDesktopClient } from '@docker/extension-api-client';

type DockerDesktopClient = ReturnType<typeof createDockerDesktopClient>;

declare global {
  interface Window {
    ddClient?: DockerDesktopClient;
  }
}

function createDevClient(): DockerDesktopClient {
  return {
    docker: {
      cli: {
        exec: async (command: string, args: string[] = []) => {
          const commandLine = [command, ...args].join(' ');

          if (commandLine.includes('inspect') && commandLine.includes('.State.Running')) {
            return { stdout: 'true\n', stderr: '' };
          }

          if (commandLine === 'container inspect temporal-dev') {
            return {
              stdout: JSON.stringify([
                { Mounts: [{ Type: 'volume', Name: 'temporal-dev-data', Destination: '/data' }] },
              ]),
              stderr: '',
            };
          }

          if (commandLine.startsWith('ps')) {
            return { stdout: 'running\n', stderr: '' };
          }

          if (commandLine.includes('task-queue describe')) {
            return { stdout: JSON.stringify({ pollers: [{ identity: 'local-dev' }] }), stderr: '' };
          }

          if (commandLine.includes('operator cluster health')) {
            return { stdout: '{}', stderr: '' };
          }

          if (commandLine.includes('temporal-dev-data')) {
            return { stdout: 'true\n', stderr: '' };
          }

          return { stdout: '', stderr: '' };
        },
      },
    },
    host: {
      openExternal: (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    },
  } as DockerDesktopClient;
}

export const ddClient = window.ddClient ?? (import.meta.env.DEV ? createDevClient() : createDockerDesktopClient());

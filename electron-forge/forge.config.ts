import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';

// Create an array of plugins with proper typing
const plugins: any[] = [
  new VitePlugin({
    build: [
      {
        entry: 'src/main.ts',
        config: 'vite.main.config.ts',
        target: 'main',
      },
      {
        entry: 'src/preload.ts',
        config: 'vite.preload.config.ts',
        target: 'preload',
      },
    ],
    renderer: [],
  }),
];

// Only add FusesPlugin during packaging (production), not for development
if (process.env.NODE_ENV === 'production') {
  plugins.push(
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    })
  );
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: [
      path.resolve(__dirname, '../dist/fdt_desktop/browser'),
      path.resolve(__dirname, 'assets'), // Include full assets directory
    ],
    // Explicitly define what files to include from the Angular output
    ignore: [
      /node_modules/,
      /\.git/,
      /\.vscode/,
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'fdt_installer',
      setupExe: 'fdt installer.exe',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins,
};

export default config;

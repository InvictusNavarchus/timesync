import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { cfHeaders } from '@navarchus/cf-headers/vite';
import {
	securityHeadersPreset,
	immutableAssetsPreset,
	noIndexPreviewDomainPreset
} from '@navarchus/cf-headers';

export default defineConfig({
	plugins: [
		sveltekit(),
		cfHeaders({
			rules: [
				securityHeadersPreset('/*'),
				immutableAssetsPreset('/_app/immutable/*'),
				noIndexPreviewDomainPreset()
			]
		})
	]
});


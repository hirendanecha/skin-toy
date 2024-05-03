const url = 'https://api.skin.toys';
const webUrl = 'https://skin.toys/';
const tubeUrl = 'https://tube.skin.toys/'

// const url = 'http://localhost:8080';
// const webUrl = 'http://localhost:4200/';

export const environment = {
  production: false,
  hmr: false,
  serverUrl: `${url}/api/v1/`,
  socketUrl: `${url}/`,
  webUrl: webUrl,
  tubeUrl: tubeUrl,
  domain: '.skin.toys',
  siteKey: '0x4AAAAAAATU1CBk_lvwGxIy',
  secretKey: '0x4AAAAAAATU1GanFiWSflL_7a_cnZt_SKM',
};

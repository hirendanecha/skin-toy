const url = 'https://api.skin.toys';
const webUrl = 'https://skin.toys/';
const tubeUrl = 'https://tube.skin.toys/';

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
  siteKey: '0x4AAAAAAAZb0V1ViJGZlVqs',
  secretKey: '0x4AAAAAAAZb0T4LJc7WTV4abAMocWRXQMU',
  qrLink: `${webUrl}settings/edit-profile/`,
  EncryptIV: 8625401029409790,
  EncryptKey: 8625401029409790,
};

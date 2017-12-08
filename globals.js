// @flow

const REGION_LIST: Array<Region> = require('./config/regions.json');

export function getRegion(region: string): Region {
  return REGION_LIST.filter(r => r.key.toLowerCase() === region.toLowerCase())[0];
}

export const TASK_SETUP_PROMPT = {
  taskCount: {
    description: 'Number of tasks to create',
    type: 'number',
    minimum: 1,
    message: 'Task count can only be a positive number greater than zero.',
    required: true
  },
  pid: {
    description: 'Product ID',
    type: 'string',
    required: true
  },
  region: {
    description: 'Adidas region',
    type: 'string',
    required: true
  },
  sizes: {
    description: 'Sizes (separate with a comma OR press enter for 4-14 split among task count)',
    type: 'string',
    required: false
  },
  proxy: {
    description: 'Run with proxies (true/false)',
    type: 'boolean',
    message: 'Valid inputs are true/false',
    required: true
  },
  splash: {
    description: 'Splash tasks (true/false)',
    type: 'boolean',
    message: 'Valid inputs are true/false',
    required: true
  },
  testMode: {
    description: 'Testing mode (true/false) - press enter to skip',
    type: 'boolean'
  }
};

export type Region = {
  key: string,
  domain: string,
  locale: string,
  demandwareSite: string,
  microSiteLocation: string
};

export type SplashResultParams = {
  hmacMethod: string,
  sitekey: ?string,
  captchaDuplicate: string,
  clientId: ?string
};

export type CartOptions = {
  id: Number,
  region: Region,
  pid: string,
  size: string,
  userAgent: string,
  cookieJar: ?Object,
  splash: Booean,
  proxy: string,
  test: Boolean
};

export type SplashOptions = {
  id: Number,
  region: Region,
  size: string,
  userAgent: string,
  proxy: string,
  test: Boolean
};

export type Cart = {
  basketUrl: string,
  size: string,
  pid: string
};

import request from 'request-promise';
import cheerio from 'cheerio';
import chalk from 'chalk';
import moment from 'moment';
import { Cookie } from 'tough-cookie';

import CartTask from './cart-task';
import type { Region, SplashOptions } from '../globals';
import { log, logErr, logSuccess, buildHeaders } from '../utils/util';

async function simpleRequest(url, cookies, taskOptions) {
  if (url.startsWith('/')) {
    if (taskOptions.test) {
      url = `http://cartchefs.co.uk${url}`;
    } else {
      url = `http://adidas.com${url}`;
    }
  }

  const opts = {
    url,
    method: 'GET',
    gzip: true,
    headers: buildHeaders(url, taskOptions.userAgent),
    proxy: taskOptions.proxy,
    jar: cookies,
    simple: false,
    resolveWithFullResponse: true
  }

  try {
    const res = await request(opts);

    return res;
  } catch (e) {
    throw new Error(`Request (${url}) failed: ${e.message}`);
  }
}

function isHmac(cookie) {
  if (cookie.key.toLowerCase().includes('gceeqs') || cookie.value.toLowerCase().includes('hmac')) {
    return true;
  }
  return false;
}

function parseCookieHeader(headers: Object) {
  let newCookies;

  if (headers['set-cookie'] instanceof Array) {
    newCookies = headers['set-cookie'].map(Cookie.parse);
  } else {
    newCookies = [Cookie.parse(headers['set-cookie'])];
  }

  if (newCookies.filter(c => isHmac(c)).length > 0) {
    return true;
  }

  return false;
}

const QUOTE_MATCH = /(["'])(?:(?=(\\?))\2.)*?\1/g;

async function findCaptchaDuplicate($, cookies, taskOptions): ?string {
  const tags = $('script');
  let appJs = null;

  tags.each((i, el) => {
    const code = $.html(el);

    const quoteMatches = code.match(QUOTE_MATCH);
    const jsMatches = quoteMatches.filter(m => m.toLowerCase().includes('application.js'));

    if (jsMatches.length > 0) {
      // remove quotes
      appJs = jsMatches[0].substring(1, jsMatches[0].length - 1);
    }

    // const src = $(el).attr('src');
    // if (src !== undefined) {
    //   if (src.includes('application.js')) {
    //     appJs = src;
    //   }
    // }
  });

  if (appJs) {
    if (appJs.startsWith('//')) {
      appJs = appJs.substring(2, appJs.length);
    }

    try  {
      const res = await simpleRequest(appJs, cookies, taskOptions);

      if (res.statusCode !== 200) {
        throw new Error(`Application js gave unexpected status code ${res.statusCode}`);
      }

      const jsBody = res.body;

      if (jsBody) {
        const el = jsBody.split('append(\'<input')[1].split('\');')[0];

        const captchaDuplicate = el.split('name="')[1].split('"')[0];

        return captchaDuplicate;
      }
    } catch (e) {
      throw new Error(`Error fetching captcha duplicate: ${e.message}`);
    }
  }

  return null;
}

export default class SplashTask {
  id: Number;
  options: SplashOptions;
  cookies: Object;
  url: string;
  successCallback: Function;
  timerId: string;

  constructor(
    options: SplashOptions,
    successCallback: Function
  ) {
    this.options = options;
    this.id = options.id;
    this.cookies = request.jar();
    if (options.test) {
      this.url = 'http://cartchefs.co.uk/splash_test';
    } else {
      this.url = `http://www.adidas.com/${region.microSiteLocation}/apps/yeezy`;
    }
    this.successCallback = successCallback;

    this.startTimer();
    this.run();
  }

  startTimer() {
    this.timerId = setInterval(async () => {
      await this.run();
    }, 10000);
  }

  async run() {
    const passed = await this.refreshPage();

    if (passed) {
      clearInterval(this.timerId);
      logSuccess(`PASSED SPLASH: ${JSON.stringify(passed)}`, true, this.id);
      return this.successCallback(this.cookies, passed);
    }
  }

  async refreshPage() {
    const opts = {
      url: this.url,
      method: 'GET',
      gzip: true,
      headers: buildHeaders(this.url, this.options.userAgent),
      proxy: this.options.proxy,
      jar: this.cookies,
      simple: false,
      resolveWithFullResponse: true
    };

    try {
      const res = await request(opts);

      if (res.statusCode !== 200) {
        logErr(`Server responded with non-normal status code of ${res.statusCode}`, true, this.id);
        return null;
      }

      let passed = null;

      // Try parsing Cookies from the response headers
      if(res.headers['set-cookie'] !== null && res.headers['set-cookie'] !== undefined) {
        try {
          if (parseCookieHeader(res.headers)) {
            passed = 'COOKIE HEADER';
          }
        } catch (e) {
          logErr('Error parsing new cookies from headers', true, this.id);
        }
      }

      if (!passed) {
        // if not found, check the cookie jar (incase we missed something?)
        const cookies = this.cookies.getCookies(this.url);

        if (cookies.filter(c => isHmac(c)).length > 0) {
          passed = 'COOKIEJAR';
        }
      }

      let $ = null;

      if (!passed) {
        // finally, attempt to locate captcha from DOM as last resort.
        $ = cheerio.load(res.body);

        if ($('.g-recaptcha').length > 0) {
          passed = 'CAPTCHA ELEMENT';
        }
      }

      if (passed) {
        // get client id
        const cId = res.body.split('?clientId=')[1].split('"')[0];

        if ($ == null) {
          $ = cheerio.load(res.body);
        }

        let sitekey;

        const cap = $('.g-recaptcha');

        if (cap.length > 0) {
          sitekey = cap.attr('data-sitekey');
        }

        let captchaDuplicate;

        try {
          captchaDuplicate = await findCaptchaDuplicate($, this.cookies, this.options);
        } catch (e) {
          console.log(e);
        }

        return {
          hmacMethod: passed,
          sitekey,
          captchaDuplicate: captchaDuplicate ? captchaDuplicate : 'x-PrdRt',
          clientId: cId
        };
      }

      log('Still on splash...', true, this.id);
      return null;
    } catch (e) {
      logErr(`Error loading Splash page: ${e.message}`, true, this.id);
    }
  }
}

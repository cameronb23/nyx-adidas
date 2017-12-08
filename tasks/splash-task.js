import request from 'request-promise';
import cheerio from 'cheerio';
import chalk from 'chalk';
import moment from 'moment';
// import { Cookie, CookieJar } from 'request-cookies';
import CookieParser from 'cookie';
import { Cookie, CookieJar } from 'tough-cookie';

import CartTask from './cart-task';
import type { Region, SplashOptions } from '../globals';
import { log, logErr, logSuccess, buildHeaders } from '../utils/util';

async function simpleRequest(url, cookies, taskOptions) {
  if (url.startsWith('/')) {
    if (taskOptions.test) {
      url = `http://staging.adidas.com${url}`;
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
    // newCookies = headers['set-cookie'].map((el) => new Cookie(el))
  } else {
    newCookies = [Cookie.parse(headers['set-cookie'])];
    // newCookies = [new Cookie(headers['set-cookie'])];
  }

  return newCookies;
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

      try  {
        if (jsBody) {
          const el = jsBody.split('append(\'<input')[1].split('\');')[0];

          const captchaDuplicate = el.split('name="')[1].split('"')[0];

          return captchaDuplicate;
        }
      } catch (e) {
        return null;
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
  cookieSet: Object;
  url: string;
  successCallback: Function;
  timerId: string;
  capDup: string; // cached

  constructor(
    options: SplashOptions,
    successCallback: Function
  ) {
    this.options = options;
    this.id = options.id;
    this.cookieSet = {};
    this.cookies = request.jar();
    this.cookies._jar.rejectPublicSuffixes = false;
    // this.cookies = new CookieJar();
    if (options.test) {
      this.url = 'http://www.staging.adidas.com/us/apps/yeezy';
    } else {
      this.url = `http://www.adidas.com/${region.microSiteLocation}/apps/yeezy`;
    }
    this.successCallback = successCallback;

    this.capDup = null;

    this.run();
    this.startTimer();
  }

  startTimer() {
    this.timerId = setInterval(async () => {
      await this.run();
    }, 60000);
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
    const headers = buildHeaders(this.url, this.cookies, this.options.userAgent);

    const opts = {
      url: this.url,
      method: 'GET',
      gzip: true,
      headers: Object.assign({}, headers, {
        Referer: `https://www.${this.options.test ? 'staging.' : ''}adidas.com/${this.options.region.microSiteLocation}/apps/yeezy/`
      }),
      proxy: this.options.proxy,
      jar: this.cookies,
      simple: false,
      resolveWithFullResponse: true
    };

    if (Object.keys(this.cookieSet).length > 0) {
      let cookieString;
      let arr = Object.keys(this.cookieSet).map(k => CookieParser.serialize(k, this.cookieSet[k]));
      opts.headers.Cookie = arr.join('; ');
      console.log(opts.headers.Cookie);
    }

    try {
      const res = await request(opts);

      let passed = null;

      if (res.body.includes('<!-- ERR_CACHE_ACCESS_DENIED -->')) {
        logErr('Proxy connection failed', true, this.id);
        return;
      }

      // Try parsing Cookies from the response headers
      if(res.headers['set-cookie'] !== null && res.headers['set-cookie'] !== undefined) {
        try {

          console.log(res.headers['set-cookie']);

          const headerCookies = parseCookieHeader(res.headers);
          const newCookies = {};

          // EXTRACT TRACKING COOKIES FROM PAGE
          if (res.body.includes('document.cookie')) {
            const cookie = res.body.split('document.cookie')[1].split('"')[1].split('"')[0].split('=');
            newCookies[cookie[0]] = cookie[1];
          }

          headerCookies.forEach(c => newCookies[c.key] = c.value);

          this.cookieSet = Object.assign({}, this.cookieSet, newCookies);

          Object.keys(this.cookieSet).forEach(k => {
            if (k.toLowerCase() === 'gceeqs' || this.cookieSet[k].toLowerCase().includes('hmac')) {
              passed = 'COOKIE HEADER';
            }
          });
        } catch (e) {
          console.log(e);
          logErr('Error parsing new cookies from headers', true, this.id);
        }
      }

      if (res.statusCode === 401 && this.url.includes('staging')) {
        logSuccess('[STAGING] Passed splash successfully', true, this.id);
        passed = 'STAGING';
      } else {
        if (res.statusCode !== 200 && !passed) {
          logErr(`Server responded with non-normal status code of ${res.statusCode}`, true, this.id);
          return null;
        }
      }

      if (!passed) {
        // if not found, check the cookie jar (incase we missed something?)
        const cookies = await this.cookies._jar.getCookiesSync(res.request.uri);

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

      try {
        this.capDup = await findCaptchaDuplicate($, this.cookies, this.options);
      } catch (e) {
        console.log(e);
      }

      if (passed) {
        // get client id
        let cId;

        if (res.body.includes('?clientId=')) {
          cId = res.body.split('?clientId=')[1].split('"')[0];
        }

        if ($ == null) {
          $ = cheerio.load(res.body);
        }

        let sitekey;

        const cap = $('.g-recaptcha');

        if (cap.length > 0) {
          sitekey = cap.attr('data-sitekey');
        }

        return {
          hmacMethod: passed,
          sitekey,
          captchaDuplicate: this.capDup ? this.capDup : 'not found', // x-PrdRt
          clientId: cId
        };
      }

      // const cSet = await this.cookies._jar.getCookiesSync(res.request.uri, { allPaths: true });
      // console.log(cSet);
      const count = Object.keys(this.cookieSet).length;
      log(`Still on splash... [${res.statusCode}][${res.headers['set-cookie'].length}][${count}]`, true, this.id);
      return null;
    } catch (e) {
      console.log(e);
      logErr(`Error loading Splash page: ${e.message}`, true, this.id);
    }
  }
}

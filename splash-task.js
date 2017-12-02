import request from 'request-promise';
import cheerio from 'cheerio';
import { Cookie } from 'tough-cookie';

import type { Region } from './globals';

export default class SplashTask {
  id: Number;
  url: string;
  region: Region;
  cookies: Object;
  userAgent: string;
  successCallback: Function;
  timerId: string;

  constructor(id: Number, region: Region, cookieJar: ?Object, userAgent: string, successCallback: Function) {
    this.id = id;
    this.region = region;
    this.url = `http://www.adidas.com/${region.microSiteLocation}/apps/yeezy`;
    this.cookies = cookieJar;
    this.userAgent = userAgent;
    this.successCallback = successCallback;

    this.run();
  }

  run() {
    this.timerId = setInterval(async () => {
      console.log(`(${this.id}) Still on splash`);

      try {
        const passed = await this.refreshPage();

        if (passed) {
          clearInterval(this.timerId);
          console.log(`(${this.id}) PASSED SPLASH: ${JSON.stringify(passed)}`);
          this.successCallback();
        }
      } catch (e) {
        console.log(e);
      }
    }, 10000);
  }

  async req(url) {
    if (url.startsWith('/')) {
      url = `http://cartchefs.co.uk${url}`;
    }
    
    const opts = {
      url,
      method: 'GET',
      gzip: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        Host: 'www.adidas.com',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': this.userAgent
      },
      jar: this.cookies,
      simple: false,
      resolveWithFullResponse: true
    }

    try {
      const res = await request(opts);

      return res.body;
    } catch (e) {
      console.log(e);
      console.log('Error requesting resource: ', url);
      return null;
    }
  }

  async refreshPage() {
    const opts = {
      url: 'http://cartchefs.co.uk/splash_test',
      method: 'GET',
      gzip: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        Host: 'www.adidas.com',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': this.userAgent
      },
      jar: this.cookies,
      simple: false,
      resolveWithFullResponse: true
    };

    try {
      const res = await request(opts);

      if (res.statusCode !== 200) {
        throw new Error(`Server responded with non-normal status code of ${res.statusCode}`);
      }

      let passed = null;

      // Try parsing Cookies from the response headers
      if(res.headers['set-cookie'] !== null && res.headers['set-cookie'] !== undefined) {
        try {
          let newCookies;

          if (res.headers['set-cookie'] instanceof Array) {
            newCookies = res.headers['set-cookie'].map(Cookie.parse);
          } else {
            newCookies = [Cookie.parse(res.headers['set-cookie'])];
          }

          if (newCookies.filter(c => c.value.includes('hmac')).length > 0) {
            passed = 'COOKIE HEADER';
          }
        } catch (e) {
          console.log(e);
          console.log('Error parsing new cookies from headers..');
        }
      }
      
      if (!passed) {
        // if not found, check the cookie jar (incase we missed something?)
        const cookies = this.cookies.getCookies(this.url);
  
        if (cookies.filter(c => c.value.includes('hmac')).length > 0) {
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
        const cId = res.body.split('?clientId=')[1].split('"')[0];

        if ($ == null) {
          $ = cheerio.load(res.body);
        }

        let appJs = null;
        const tags = $('script');

        tags.each((i, el) => {
          const src = $(el).attr('src');
          if (src !== undefined) {
            if (src.includes('application.js')) {
              appJs = src;
            }
          }
        });

        if (appJs.startsWith('//')) {
          appJs = appJs.substring(2, appJs.length);
        }

        const jsBody = await this.req(appJs);
        let captchaDuplicate = null;

        if (jsBody !== null) {
          const el = jsBody.split('append(\'')[1].split('\');')[0];

          console.log(el);

          captchaDuplicate = el.split('name="')[1].split('"')[0];

          console.log(captchaDuplicate);
        }

        return {
          hmacMethod: passed,
          captchaDuplicate: captchaDuplicate,
          clientId: cId
        };
      }

      return null;
    } catch (e) {
      console.log(e);
      throw new Error(`Error loading Splash page: ${e}`);
    }
  }
}

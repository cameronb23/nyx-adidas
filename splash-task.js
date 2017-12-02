import request from 'request-promise';
import cheerio from 'cheerio';
import { Cookie } from 'tough-cookie';

export default class SplashTask {
  id: Number;
  url: string;
  cookies: Object;
  userAgent: string;
  successCallback: Function;
  timerId: string;

  constructor(id: Number, url: string, cookieJar: ?Object, userAgent: string, successCallback: Function) {
    this.id = id;
    this.url = url;
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
          console.log(`(${this.id}) PASSED SPLASH: ${passed}`);
          this.successCallback();
        }
      } catch (e) {
        console.log(e);
      }
    }, 10000);
  }

  async refreshPage() {
    const opts = {
      url: this.url,
      method: 'GET',
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
            return 'COOKIE HEADER';
          }
        } catch (e) {
          console.log(e);
          console.log('Error parsing new cookies from headers..');
        }
      }
      // if not found, check the cookie jar (incase we missed something?)
      const cookies = this.cookies.getCookies(this.url);

      if (cookies.filter(c => c.value.includes('hmac')).length > 0) {
        return 'COOKIEJAR';
      }

      // finally, attempt to locate captcha from DOM as last resort.
      const $ = cheerio.load(res.body);

      if ($('.g-recaptcha').length > 0) {
        return 'CAPTCHA ELEMENT';
      }

      return null;
    } catch (e) {
      throw new Error(`Error loading Splash page: ${e}`);
    }
  }
}

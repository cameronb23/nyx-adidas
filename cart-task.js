import type { Region, SplashParams } from './globals';


// https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/Cart-AddExternal?quantity=1&pid=S82021_640

class CartTask {

  pid: string;
  cookieJar: Object;
  userAgent: string;
  region: Region;
  splash: SplashParams;

  constructor(pid: string, cookieJar: Object, userAgent: string, region: Region, params: SplashParams) {
    this.pid = pid;
    this.cookieJar = cookieJar;
    this.userAgent = userAgent;
    this.region = region;
    this.splash = params;

    this.run();
  }

  run() {
    try {
      // get CAPTCHA
      // submit
    } catch (e) {
      return this.run();
    }
  }

  async getCaptcha() {

  }

  async loadPage() {
    const opts = {
      url: `http://www.adidas.${this.region.domain}/${this.region.microSiteLocation}/apps/yeezy/`,
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        Host: 'www.adidas.com',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': this.userAgent
      },
      jar: this.cookieJar,
      simple: false,
      resolveWithFullResponse: true
    };

    try {
      const res = await request(opts);

      if (res.statusCode !== 200) {
        throw new Error(`Server responded with non-normal status code of ${res.statusCode}`);
      }

      const $ = cheerio.load(res);
    } catch (e) {
      throw new Error(`Error loading Splash page: ${e}`);
    }
  }

  async atc(captchaResponse: string, captchaDuplicate: string, clientId: string) {
    const base_url =
                    `http://www.adidas.${this.region.domain}` +
                    `/on/demandware.store/Sites-adidas-${this.region.siteStr}-Site/${this.region.locale}` +
                    `/Cart-MiniAddProduct`;

    const data = {
      masterPid: this.pid.split('_')[0], // only style
      pid: this.pid,
      Quantity: 1,
      request: 'ajax',
      responseformat: 'json',
      sessionSelectedStoreID: 'null'
    };

    if (captchaResponse) {
      data['g-recaptcha-response'] = captchaResponse;
    }

    if (captchaDuplicate) {
      data[captchaDuplicate] = captchaResponse;
    }

    if (clientId) {
      base_url += `?clientId=${clientId}`;
    }

    try {

    } catch (e) {
      throw new Error(e);
    }
  }

}

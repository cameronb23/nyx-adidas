type Region = {
  domain: string,
  locale: string,
  siteStr: string
};

class CartTask {

  pid: string;
  cookieJar: Object;
  userAgent: string;
  region: Region;

  constructor(pid: string, cookieJar: Object, userAgent: string, region: Region) {
    this.pid = pid;
    this.cookieJar = cookieJar;
    this.userAgent = userAgent;
    this.region = region;

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

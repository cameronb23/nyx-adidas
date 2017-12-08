import moment from 'moment';
import request from 'request-promise';
import chalk from 'chalk';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

import type { Region, CartOptions, SplashResultParams } from '../globals';
import { fetchCaptcha } from '../captcha-server';
import { log, logErr, logSuccess, buildHeaders, getSizeCode } from '../utils/util';

export default class CartTask {

  id: Number;
  options: CartOptions;
  pid: string;
  cookies: Object;
  splash: SplashParams;
  timerId: string;
  cancel: Boolean;
  captcha: string;
  sitekey: string;
  successCallback: Function;

  constructor(options: CartOptions, params: SplashResultParams, successCallback: Function) {
    this.id = options.id;
    this.options = options;
    this.cookies = options.cookieJar;
    if (params) {
      this.splash = params;
      this.sitekey = params.sitekey;
    }
    this.successCallback = successCallback;

    // parse size
    this.pid = `${options.pid}_${getSizeCode(options.size)}`;

    this.cancel = false;
    this.captcha = null;

    this.start();
  }

  async start() {
    if (this.sitekey) {
      log(chalk.yellow('Waiting for captcha...'), true, this.id);
      this.captcha = await this.getCaptcha();
      this.run();
    } else {
      this.run();
    }
  }

  getCaptcha() {
    return new Promise(resolve => {
      const capTimer = setInterval(() => {
        const cap = fetchCaptcha();


        if (cap != null) {
          clearInterval(capTimer);
          return resolve(cap);
        }
      }, 2000);
    })
  }

  async run() {
    if (this.cancel) {
      clearInterval(this.timerId);
      return;
    }

    let response;

    if (this.options.splash) {
      response = await this.atc(this.captcha ? this.captcha.token : null);
    } else {
      response = await this.atcNew(this.captcha ? this.captcha.token : null);
    }

    this.captcha = null;

    if (response) {
      logSuccess(`Successfully carted product ${this.options.pid} in size ${this.options.size}`, true, this.id);
      clearInterval(this.timerId);
      // write cookies to file
      const cookieString = JSON.stringify(this.cookies);

      const timeStamp = moment().format('hh-mm-ss-SSS');
      const fileName = `${timeStamp}(${this.options.size.replace('.', '-')}).txt`;

      const domain = `http://www.adidas.${this.options.region.domain}`;

      // just in case
      const cookies = await this.cookies.getCookies(domain);
      const cookie = cookies.filter(c => c.key === 'restoreBasketUrl')[0];
      const uriEnd = decodeURIComponent(cookie.value);

      const basketUrl = `http://www.adidas.${this.options.region.domain}${uriEnd}`;

      this.successCallback({
        url: basketUrl,
        size: this.options.size,
        pid: this.pid.split('_')[0]
      });

      fs.appendFile(path.join(__dirname, `../success/${fileName}`), cookieString, 'utf8', (err) => {
        if (err) {
          logErr('Error writing success data', true, this.id);
          return;
        }

        logSuccess('Successfully saved success data to disk', true, this.id);
      });
    }

    return setTimeout(() => this.start(), 3000);
  }

  async req(opts) {

  }

  async resume(opts: Object, res: Object) {
    const form = {};

    const $ = cheerio.load(res.body);

    const endpoint = $('form').attr('action');

    console.log(endpoint);

    $('input').each((i, el) => {
      const input = $(el);
      form[input.attr('name')] = input.val();
    });

    let url = endpoint;

    if (endpoint.startsWith('/')) {
      url = `https://cp.adidas.com${endpoint}`;
    }

    opts.url = url;
    console.log(url);
    opts.headers.Host = (url.split('https://')[1].split('/')[0]);
    opts.form = form;
    opts.method = 'POST';

    try {
      const resumeRes = await request(opts);

      if (resumeRes.statusCode !== 200) {
        console.log(`(RESUME) Server responded with non-normal status code of ${resumeRes.statusCode}`);
        return null;
      }

      fs.writeFileSync(path.join(__dirname, 'gg.html'), resumeRes.body);

      if (resumeRes.body.includes('Since your browser does not support JavaScript, you must press the Resume button once to proceed')) {
        return this.resume(opts, resumeRes);
      }

      console.log(resumeRes.headers);

      return opts.jar;
    } catch (e) {
      console.log(e.message);
      return null;
    }
  }

  loadAccount(basketUrl: string, cookies: Array) {

    const email = 'jessica.andersson77438@cameronb.me';
    const password = 'xghsiupx6btn';

    const url = 'https://cp.adidas.com/web/eCom/en_US/loadsignin?target=account';

    const body = {
      username: email,
      password: password,
      signinSubmit: 'Sign in',
      IdpAdapterId: 'adidasIdP10',
      SpSessionAuthnAdapterId: 'https://cp.adidas.com/web/',
      PartnerSpId: 'sp:demandware',
      validator_id: 'adieComDWus',
      TargetResource: 'https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/MyAccount-ResumeLogin?target=account',
      target: 'account',
      InErrorResource: 'https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/null',
      loginUrl: 'https://cp.adidas.com/web/eCom/en_US/loadsignin',
      cd: 'eCom|en_US|cp.adidas.com|null',
      remembermeParam: '',
      app: 'eCom',
      locale: 'US',
      domain: 'cp.adidas.com',
      email: '',
      pfRedirectBaseURL_test: 'https://cp.adidas.com',
      pfStartSSOURL_test: 'https://cp.adidas.com/idp/startSSO.ping',
      resumeURL_test: '',
      FromFinishRegistraion: '',
      CSRFToken: ''
    };

    const opts = {
      url: 'https://cp.adidas.com/idp/startSSO.ping',
      method: 'GET',
      headers: Object.assign({}, buildHeaders(url, this.options.userAgent), {
        Host: 'cp.adidas.com'
      }),
      qs: body,
      gzip: true,
      jar: this.cookies,
      proxy: this.options.proxy,
      simple: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      followOriginalHttpMethod: true,
      maxRedirects: 20,
      timeout: 30000
    };

    return new Promise(async (resolve) => {
      try {
        // const res = await request(opts);
        //
        // if (res.statusCode !== 200) {
        //   console.log(`Server responded with non-normal status code of ${res.statusCode}`);
        //   return resolve(false);
        // }
        //
        // const $ = cheerio.load(res.body);
        // const csrfEl = $('[name="CSRFToken"]');
        //
        // let csrf;
        //
        // if (csrfEl) {
        //   csrf = csrfEl.val();
        // }
        //
        // console.log(csrf);

        // opts.url = `https://cp.adidas.com/idp/startSSO.ping?username=${email}&password=${password}&signinSubmit=Sign%20in&IdpAdapterId=adidasIdP10&SpSessionAuthnAdapterId=https://cp.adidas.com/web/&PartnerSpId=sp:demandware&validator_id=adieComDWus&TargetResource=https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/MyAccount-ResumeLogin?target=account&target=account&InErrorResource=https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/null&loginUrl=https://cp.adidas.com/web/eCom/en_US/loadsignin&cd=eCom|en_US|cp.adidas.com|null&remembermeParam=&app=eCom&locale=US&domain=cp.adidas.com&email=&pfRedirectBaseURL_test=https://cp.adidas.com&pfStartSSOURL_test=https://cp.adidas.com/idp/startSSO.ping&resumeURL_test=&FromFinishRegistraion=&CSRFToken=null`;

        const loginRes = await request(opts);

        if (loginRes.statusCode !== 200) {
          console.log(`(SSO) Server responded with non-normal status code of ${loginRes.statusCode}`);
          return resolve(false);
        }

        const backUrl = loginRes.request.uri;

        if (loginRes.body.includes('var resURL = \'')) {
          const redirect = loginRes.body.split('var resURL = \'')[1].split('\'')[0];
          console.log('found redirect: ', redirect);

          opts.url = redirect;
          opts.headers.Referer = backUrl;
          opts.qs = null;

          const againRes = await request(opts);

          if (againRes.statusCode !== 200) {
            console.log(`(LOAD) Server responded with non-normal status code of ${againRes.statusCode}`);
            return resolve(false);
          }

          const jar = await this.resume(opts, againRes);

          if (jar !== null) {
            opts.jar = jar;
            opts.url = basketUrl;

            const basketRes = await request(opts);

            if (basketRes.statusCode !== 200) {
              console.log(`(BASKET) Server responded with non-normal status code of ${basketRes.statusCode}`);
              return resolve(false);
            }

            console.log(basketRes.headers);

          }

          // check basket
          opts.url = 'https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/Cart-ProductCount';

          const countRes = await request(opts);

          if (countRes.statusCode !== 200) {
            console.log(`(COUNT) Server responded with non-normal status code of ${countRes.statusCode}`);
            return resolve(false);
          }

          console.log(countRes.body);

          return resolve(outcome);
        }

        return resolve(true);
      } catch (e) {
        throw new Error(`Error loading account: ${e}`);
        return resolve(false);
      }
    });
  }

  async atcNew(captchaResponse: string) {
    logSuccess('Attempting add to cart...', true, this.id);

    const baseUrl = `http://www.adidas.${this.options.region.domain}`;

    let atcUrl = baseUrl + `/api/cart_items?sitePath=${this.options.region.key.toLowerCase}`;

    const data = {
      clientCaptchaResponse: captchaResponse,
      invalidFields: [],
      isValidating: false,
      product_id: this.pid.split('_')[0],
      product_variation_sku: this.pid,
      quantity: 1,
      recipe: null,
      size: this.options.size,
    };

    console.log(data);

    const opts = {
      url: atcUrl,
      method: 'POST',
      headers: {
        Accept: '*/*',
        Connection: 'keep-alive',
        DNT: 1,
        Host: 'www.adidas.com',
        Origin: 'https://www.adidas.com',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/json',
        'User-Agent': this.options.userAgent
      },
      body: JSON.stringify(data),
      json: true,
      jar: this.cookies,
      proxy: this.options.proxy,
      simple: false,
      resolveWithFullResponse: true
    };

    try {
      const res = await request({
        url: `${baseUrl}/${this.options.region.microSiteLocation.toLowerCase()}/cameron-is-washed/${this.pid.split('_')[0]}.html`,
        method: 'GET',
        headers: buildHeaders(baseUrl, this.options.userAgent),
        jar: this.cookies,
        proxy: this.options.proxy,
        simple: false,
        resolveWithFullResponse: true
      });

      console.log(res.request.uri.href);

      opts.headers.Referer = res.request.uri.href;

      console.log(opts.headers);

      const response = await request(opts);

      console.log(response.statusCode);
      console.log(response.body);

      if (response.statusCode === 401) {
        return
      }

      if (response.statusCode !== 200) {
        logErr(`Error carting: ${response.statusCode}`, true, this.id);
        return false;
      }

      const data = response.body;

      if (!data) {
        logErr('Error carting: undefined error', true, this.id);
        return false;
      }

      if (data.product_quantity < 1) {
        logErr('Error carting: failed', true, this.id);
        return false;
      }

      return true;
    } catch (e) {
      logErr(e, true, this.id);
    }
  }

  async atc(captchaResponse: string) {
    logSuccess('Attempting add to cart...', true, this.id);

    const baseUrl = `http://www.adidas.${this.options.region.domain}/on/demandware.store/Sites-adidas-${this.options.region.demandwareSite}-Site/${this.options.region.locale}`;

    let atcUrl = baseUrl + '/Cart-MiniAddProduct';

    const cartCountUrl = baseUrl + '/Cart-ProductCount';

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

    if (this.splash.captchaDuplicate && !this.options.test) {
      data[this.splash.captchaDuplicate] = captchaResponse;
    }

    if (this.splash.clientId && !this.options.test) {
      atcUrl += `?clientId=${this.splash.clientId}`;
    }

    const opts = {
      url: atcUrl,
      method: 'GET',
      gzip: true,
      headers: buildHeaders(baseUrl, this.options.userAgent),
      qs: data,
      jar: this.cookies,
      proxy: this.options.proxy,
      json: true,
      simple: false,
      resolveWithFullResponse: true
    };

    try {
      const response = await request(opts);

      console.log(response.statusCode);
      console.log(response.body);

      if (response.statusCode === 401) {
        return
      }

      if (response.statusCode !== 200) {
        logErr(`Error carting: response.statusCode`, true, this.id);
        return false;
      }

      const data = response.body;

      if (!data.result || !data.basket) {
        logErr('Error carting: undefined error', true, this.id);
        return false;
      }

      if (data.result !== 'SUCCESS') {
        logErr('Error carting: oos/invalid captcha', true, this.id);
        return false;
      }

      if (data.basket.length < 1) {
        return false;
      }

      return true;
    } catch (e) {
      logErr(e, true, this.id);
    }
  }

}

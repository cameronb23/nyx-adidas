// @flow
import request from 'request-promise';
import cheerio from 'cheerio';
import { Cookie } from 'tough-cookie';

const instances = [];

async function refreshPage(url: string, cookieJar: ?Object, userAgent: string) {
  if (cookieJar == null) {
    cookieJar = request.jar();
  }

  const opts = {
    url,
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',     
      Host: 'www.adidas.com',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': userAgent
    },
    jar: cookieJar,
    simple: false,
    resolveWithFullResponse: true
  };

  try {
    const res = await request(opts);
    
    if (res.statusCode !== 200) {
      throw new Error(`Server responded with non-normal status code of ${res.statusCode}`);
    }

    // Try parsing Cookies from the response headers
    try {
      let newCookies;

      if (res.headers['set-cookie'] instanceof Array) {
        newCookies = res.headers['set-cookie'].map(Cookie.parse);
      } else {
        newCookies = [Cookie.parse(res.headers['set-cookie'])];
      }

      if (newCookies.filter(c => c.value.includes('hmac')).length > 0) {
        return true;
      }
    } catch (e) {
      console.log('Error parsing new cookies from headers..');
    }

    // if not found, check the cookie jar (incase we missed something?)
    const cookies = cookieJar.getCookies(url);
    
    if (cookies.filter(c => c.value.includes('hmac')).length > 0) {
      return true;
    }

    // finally, attempt to locate captcha as last resort.
    const $ = cheerio.load(res.body);

    if ($('.g-recaptcha').length > 0) {
      return true;
    }

    return false;
  } catch (e) {
    throw new Error('Error loading Splash page...retrying.');
  }
}
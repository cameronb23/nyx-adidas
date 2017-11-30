// @flow
import request from 'request-promise';
import cheerio from 'cheerio';
import { Cookie } from 'tough-cookie';

const instances = [];

type Region = {
  domain: string,
  locale: string,
  siteStr: string
};

// https://www.adidas.com/on/demandware.store/Sites-adidas-US-Site/en_US/Product-Show?pid=%20AH2203

async function getHmacImage(cookieJar: Object, userAgent: string) {
  const opts = {
    url: 'http://adidas.com/ru/apps/yeezy',
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',     
      Host: 'www.adidas.com',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': userAgent
    },
    jar: cookieJar,
    transform: (body) => {
      return cheerio.load(body);
    }
  }

  try {
    const $ = request(opts);
    

  } catch (e) {
    console.log('Error making request.');
    return null;
  }
}

async function updateBagCart(prodCode: string, cookieJar: Object, userAgent: string, region: Region) {
  const opts = {
    url: `https://www.adidas.${region.domain}/on/demandware.store/Sites-adidas-${region.siteStr}-Site/${region.locale}/Cart-Show`,
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',     
      Host: 'www.adidas.com',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': userAgent
    },
    jar: cookieJar
  }

  try {
    const bagRes = await request(opts);

    opts.url = `https://www.adidas.${region.domain}/on/demandware.store/Sites-adidas-${region.siteStr}-Site/${region.locale}/Cart-UpdateItems?qty_0=1&pid_0=%00${prodCode}%00`;

    const updateRes = await request(opts);

    opts.url = `https://www.adidas.${region.domain}/on/demandware.store/Sites-adidas-${region.siteStr}-Site/${region.locale}/Cart-ProductCount`;

    const finalBagRes = await request(opts);

    console.log(finalBagRes);
  } catch (e) {
    return false;
  }
}

const cookies = [];

function start() {
  for(let i = 0; i < 20; i++) {
    cookies[i] = request.jar();
    setInterval(async () => {
      const jar = cookies[i];

      const passed = await refreshPage('http://www.adidas.com/uk/apps/yeezy', jar, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36');

      if (passed) {
        const cook = jar.getCookies('http://www.adidas.com')
      }
    }, 10000);
  }
}

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
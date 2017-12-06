// @flow
import request from 'request-promise';
import cheerio from 'cheerio';
import { Cookie } from 'tough-cookie';
import SplashTask from './splash-task';

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

    const finalBagCount = await request(opts);

    console.log(finalBagCount);
  } catch (e) {
    return false;
  }
}

const pendingTasks = [];
const successfulTasks = [];

function start() {
  console.log('Launching 300 tasks');

  for(let i = 0; i < 300; i++) {
    const jar = request.jar();
    const t = new SplashTask(i, 'http://cartchefs.co.uk/splash_test', jar, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36', () => {
      pendingTasks.slice(pendingTasks.indexOf(t), 1);
      successfulTasks.push(t);
    });

    pendingTasks.push(t);
  }
}

start();

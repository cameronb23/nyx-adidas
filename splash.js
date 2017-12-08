// @flow
import request from 'request-promise';
import cheerio from 'cheerio';
import async from 'async';
import { Cookie } from 'tough-cookie';

// local
import type { Region, SplashOptions } from './globals';
import { getRegion } from './globals';
import { sendDiscord } from './utils/hooks';
import { loadProxies, getRandom } from './utils/util';
import { setSitekey } from './captcha-server';
import CartTask from './tasks/cart-task';
import SplashTask from './tasks/splash-task';

const instances = [];

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

export async function startTasks(tasks: Array) {
  console.log('Loading proxies...');

  const proxyData = await loadProxies();

  if (proxyData.failed.length > 0) {
    proxyData.failed.forEach(p => console.log(`Failed to parse proxy: ${p}`));
  }

  console.log(`Launching set of ${tasks.length} tasks with ${proxyData.proxies.length} proxies.`);

  const taskSet = [];

  for(let id = 0; id < tasks.length; id++) {
    const taskInfo = tasks[id];
    let proxy = null;

    if (taskInfo.proxy) {
      proxy = getRandom(proxyData.proxies);
    }

    if (taskInfo.splash) {
      taskSet.push(() => {
        const task = new SplashTask({
          id: (id + 1), // offset by one for looks
          region: taskInfo.region,
          size: taskInfo.size,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
          proxy,
          test: taskInfo.testMode
        }, (cookies: Object, params: SplashResultParams) => {
          setSitekey(params.sitekey);
          // initiate cart task
          new CartTask({
            id: (id + 1),
            pid: taskInfo.pid,
            region: taskInfo.region,
            size: taskInfo.size,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
            cookieJar: cookies,
            proxy: proxy,
            splash: taskInfo.splash,
            test: taskInfo.testMode
          }, params, (cart) => {
            sendDiscord(cart);
          });
        });
      });
    } else {
      taskSet.push(() => {
        new CartTask({
          id: (id + 1),
          pid: taskInfo.pid,
          region: taskInfo.region,
          size: taskInfo.size,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
          cookieJar: request.jar(),
          proxy: proxy,
          splash: taskInfo.splash,
          test: taskInfo.testMode
        }, null, (cart) => {
          sendDiscord(cart);
        });
      })
    }

  }

  async.parallel(taskSet);
}

// start();

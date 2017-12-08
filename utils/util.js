// core modules
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// external modules
import chalk from 'chalk';
import moment from 'moment';

export function logErr(message: string, time: boolean = true, taskId: number = -1) {
  log(chalk.red(message), time, taskId);
}

export function logSuccess(message: string, time: boolean = true, taskId: number = -1) {
  log(chalk.green(message), time, taskId);
}

export function log(message: string, time: boolean = true, taskId: number = -1) {
  let str = '';
  if (time) {
    const time = moment().format('h:mm:ss a').toUpperCase();
    str += chalk`[{cyan ${time}}]`;
  }

  if (taskId != -1) {
    str += chalk`({magenta ${taskId}})`;
  }

  str += ` ${message}`; // prepend a space
  console.log(str);
}

export function getRandom(set: Array): Object {
  return set[Math.floor(Math.random() * set.length)];
}

export function parseProxy(str: string) {
  const data = str.split(':');

  if (data.length === 2) {
    return 'http://' + data[0] + ':' + data[1];
  } else if (data.length === 4) {
    return 'http://' + data[2] + ':' + data[3] + '@' + data[0] + ':' + data[1];
  } else {
    throw new Error('Unable to parse proxy');
  }
}

export function loadProxies(): Promise<*> {
  return new Promise((resolve) => {
    const data = {
      proxies: [],
      failed: []
    };

    const reader = readline.createInterface({
      input: fs.createReadStream(path.join(__dirname, '../config/proxies.txt'))
    });

    reader.on('line', (str) => {
      try {
        const parsed = parseProxy(str);
        data.proxies.push(parsed);
      } catch (e) {
        data.failed.push(str);
      }
    });

    reader.on('close', () => {
      return resolve(data);
    });
  });
}

// https://github.com/theriley106/SneakerBotTutorials/blob/master/main.py#L11

const BASE_SIZE = 580;

export function getSizeCode(size: string) {
  try {
    const sizeNum = parseFloat(size);

    const x = sizeNum - 7.5;
    const sizeModifier = x * 20;
    const rawSize = BASE_SIZE + sizeModifier;

    return parseInt(rawSize, 10);
  } catch (e) {
    console.log('failed to parse');
    return 600;
  }
}

export function buildHeaders(url: string, userAgent: string) {
  return {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    Host: (url.includes('cartchefs') ? 'cartchefs.co.uk' : 'www.adidas.com'),
    Connection: 'keep-alive',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': userAgent,
    'Cache-Control': 'max-age=0'
  };
}

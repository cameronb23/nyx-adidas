import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import moment from 'moment';

const expressApp = express();
let expressServer;
let sitekey = '6LdC0iQUAAAAAOYmRv34KSLDe-7DmQrUSYJH8eB_';

type Captcha = {
  token: string,
  expiry: Date
};

let captchas: Array<Captcha> = [];

expressApp.use(bodyParser.json());
expressApp.set('views', path.join(__dirname + '/views'));
expressApp.set('view engine', 'ejs');

expressApp.get('/', (req, res) => {
  res.render('harvester', {
    sitekey: sitekey
  });
});

expressApp.post('/solved', (req, res) => {
  try {
    captchas.push(req.body);
    res.status(200).send('Done');
  } catch (e) {
    res.status(500).send('Failed');
    console.log(e);
  }
});

export default async function start() {
  expressServer = expressApp.listen(9965, () => {
    console.log('Captcha server listening on port 9965');
    return true;
  });
}

export function setSitekey(key) {
  if(key) {
    sitekey = key;
  }
}

export function fetchCaptcha() {
  if (captchas.length < 1) {
    return null;
  }

  const cap = captchas[0];
  captchas.splice(0, 1);

  return cap;
}

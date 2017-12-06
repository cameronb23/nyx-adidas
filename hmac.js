import request from 'request-promise';
import { Cookie } from 'tough-cookie';

const opts = {
	url: 'http://staging.adidas.com/yeezy/',
	method: 'GET',
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9',
		Connection: 'keep-alive',
		// Cookie: 'HRPYYU=true; adidas_country=us; __adi_rt_DkpyPh8=CRTOH2H; inf_media_split=test; us_criteo_sociomantic_split=sociomantic; RES_TRACKINGID=228558379805491; __cq_dnt=1; AMCVS_7ADA401053CCF9130A490D4C%40AdobeOrg=1; s_pvs=%5B%5BB%5D%5D; s_tps=%5B%5BB%5D%5D; utag_main=v_id:01602ca2fb7b003767f6692f3b6004071002d06900bd0$_sn:1$_ss:0$_pn:2%3Bexp-session$_st:1512579172438$ses_id:1512577366907%3Bexp-session; geo_country=US; ResonanceSegment=1; s_cc=true; AMCV_7ADA401053CCF9130A490D4C%40AdobeOrg=-227196251%7CMCIDTS%7C17507%7CMCMID%7C27758790102606364381876470297668772022%7CMCAID%7CNONE%7CMCOPTOUT-1512584572s%7CNONE; s_pers=%20s_vnum%3D1514782800437%2526vn%253D1%7C1514782800437%3B%20pn%3D2%7C1515169372964%3B%20c4%3DBRAND%257CKANYE%2520YEEZY%257CORIGINALS%257CWAITING%7C1512579175902%3B%20s_visit%3D1%7C1512579175904%3B%20s_invisit%3Dtrue%7C1512579175905%3B; BIGipServer~QA~hp.qa.brand.adidas.com_80=!Aj2sqFtkJhURhMW/8/azd8S5RBUzFEgbv07at4rjWAGNHxgdGBi4WK8fTiDw6skN2wbTKxDbOqT5eg==; TS01b4d2d0=01b0ab2260d4ed141f13b65744229a527fc6ef3b0e95339adeb358696b2d0188c0e0cd0ee0a68be412fc47fe833983cfc3fed486471d0b81761835c2470a7b08bc011baddf; akavpau_g6aighue=1512580583~id=997c7d55e93ef113e7e54100196fc073',
		DNT: 1,
		Host: 'www.staging.adidas.com',
		'Upgrade-Insecure-Requests': 1
	},
	simple: false,
	resolveWithFullResponse: true
};

async function attemptRetrieval(): Cookie {
	try {
		const res = await request(opts);

		let cookies;

		if (res.headers['set-cookie'] instanceof Array)
		  cookies = res.headers['set-cookie'].map(Cookie.parse);
		else
		  cookies = [Cookie.parse(res.headers['set-cookie'])];

		if (cookies !== null) {
			const hmacScan = cookies.filter(c => c.key === 'gceeqs' || c.value.includes('hmac'));

			if (hmacScan.length === 0) {
				return null;
			}

			return hmacScan[0];
		}

		return null;
	} catch (e) {
		console.log('Error retrieving new HMAC: ', e);
		return null;
	}
}

async function start() {
	let i = 0;

	while (i < 5) {
		i++;
		console.log((await attemptRetrieval()).value);
	}
}

start();

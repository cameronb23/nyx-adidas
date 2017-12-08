import request from 'request-promise';

import Config from '../config/config.json';
import type { Cart } from '../globals';

export async function sendDiscord(cart: Cart) {
  if (!Config.discord.enabled)
    return;
  const embeds = [
      {
          title: `Nyx Cart - ${cart.size}`,
          description: `PID: ${cart.pid}`,
          url: cart.url,
          color: 14040638, // coral
          timestamp: new Date().toISOString(),
          footer: {
              text: 'Powered by Nyx Adidas'
          },
          thumbnail: {
              url: `http://demandware.edgesuite.net/sits_pod20-adidas/dw/image/v2/aaqx_prd/on/demandware.static/-/Sites-adidas-products/en_US/dw2f4adb27/zoom/${cart.pid}_01_standard.jpg?width=80&height=80`
          },
      }
  ];

  const message = {
      embeds
  };

  const opts = {
      url: Config.discord.webhook_url,
      method: 'POST',
      body: message,
      json: true,
      resolveWithFullResponse: true,
      simple: false
  }

  try {
      const response = await request(opts);

      if ((/^2/.test('' + response.statusCode))) {
          return;
      }

      if (response.statusCode === 429) {
          setTimeout(async() => {
              return await sendDiscord(cart);
          }, response.body.retry_after);
      }
  } catch (e) {
      console.log('Error sending notification. Retrying in 1.5s');
      setTimeout(async() => {
          return await sendDiscord(cart);
      }, 1500);
  }
}

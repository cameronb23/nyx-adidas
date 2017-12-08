import request from 'request-promise';
import randName from 'node-random-name';

type Customer = {
  firstName: string,
  lastName: string,
  email: string,
  password: string
};


// https://stackoverflow.com/a/43020177
function randPassword(letters: Number, numbers: Number, either: Number): string {
  var chars = [
   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', // letters
   '0123456789', // numbers
   'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' // either
  ];

  return [letters, numbers, either].map((len, i) => {
    return Array(len).fill(chars[i]).map((x) => {
      return x[Math.floor(Math.random() * x.length)];
    }).join('');
  }).concat().join('').split('').sort(() => {
    return 0.5-Math.random();
  }).join('');
}

function generateCustomer(): Customer {
  const name = randName();
  const id = ('' + Math.random()).substring(2, 7);

  const domain = 'cameronb.me';
  const emailString = name.replace(' ', '.') + id;

  const c: Customer = {
    firstName: name.split(' ')[0],
    lastName: name.split(' ')[1],
    email: `${emailString}@${domain}`,
    password: randPassword(6, 2, 0)
  }

  return c;
}

async function createAccount(): Customer {
  const cust = generateCustomer();


}

console.log(generateCustomer());

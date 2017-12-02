// @flow
import chalk from 'chalk';
import prompt from 'prompt';

// TODO:
// - process management
// - request every 15-20 seconds
// - check for cookie & elements
// - region jig
// - RU image jig
// - cart edit jig

// TASKS
const modes = [
  {
    description: 'Product Mode',
    run: () => {
      prompt.get(['taskCount', 'pid'], (err, res) => {
        console.log(res);
      });
    }
  },
  {
    description: 'Yeezy Splash Mode',
    run: () => {

    }
  }
];




prompt.message = chalk.magenta('>');
prompt.delimiter = chalk.cyan(' ');

prompt.start();

function getAppMode() {
  console.log(chalk`Please select an {magenta Application Mode}\n` +
  chalk`1. {magenta Product Mode}\n` +
  chalk`2. {magenta Splash Mode}`);
  prompt.get({
    properties: {
      mode: {
        type: 'number',
        pattern: /[1-2]/,
        message: 'Must select valid option.',
        required: true
      }
    }
  }, (err, res) => {
    if (err) {
      console.log(err);
      return getAppMode();
    }

    const mode = res.mode - 1;
    modes[mode].run();
  });
}

getAppMode();

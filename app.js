// @flow
import chalk from 'chalk';
import prompt from 'prompt';
import fs from 'fs';
import cluster from 'cluster';

import { TASK_SETUP_PROMPT, getRegion } from './globals';
import { startTasks } from './splash';
import startCaptcha from './captcha-server';
import { logErrBasic, logSuccess } from './utils/util';

// TODO:
// - region jig
// - RU image jig
// - cart edit jig

let tasks = [];
let workers = [];

function buildTaskObject(res, size) {
  const region = getRegion(res.region);

  return {
    pid: res.pid,
    region,
    size,
    account: true,
    proxy: res.proxy,
    splash: res.splash,
    testMode: res.testMode
  };
}

function createTasks(tasksPerSize, remainingTasks, sizes, res) {
  let remaining = remainingTasks;

  // clear tasks
  tasks = [];

  for(let sizeIndex in sizes) {
    const size = sizes[sizeIndex];
    let i = 0;
    while (i < tasksPerSize) {
      i++;
      tasks.push(buildTaskObject(res, size));
    }

    if (remaining !== 0) {
      remaining--;
      tasks.push(buildTaskObject(res, size));
    }
  }

  saveTasks();
  logSuccess('Tasks saved to file.', false);
  process.exit(0);
}

function setupTasks(res) {
  const opts = Object.assign({}, res);

  if (res.testMode.length < 1) {
    opts.testMode = false;
  }

  if (res.sizes.length < 1) {
    opts.sizes = '4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,10.5,11,11.5,12,12.5,13,14';
  }

  if (opts.sizes.length > 0) {
    const sizes = opts.sizes.split(',');

    const basePerSize = ~~(opts.taskCount / sizes.length);
    const remainingTasks = opts.taskCount % sizes.length;
    // get remainder
    return createTasks(basePerSize, remainingTasks, sizes, opts);
  }

  logErrBasic('Error parsing sizes');
  process.exit(1);
}

// TASKS
const modes = [
  {
    description: 'Task Setup',
    run: () => {
      prompt.get({ properties: TASK_SETUP_PROMPT }, (err, res) => {
        if (err) {
          console.log(err);
          process.exit(1);
        }

        setupTasks(res);
      });
    }
  },
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
    run: async () => {
      // if (cluster.isMaster) {
      //   console.log('Starting tasks');
      //   const amount = ~~(tasks.length / 100);
      //   const remaining = tasks.length % 100;
      //
      //   console.log(amount + ':' + remaining);
      //
      //   let i = 0;
      //   while (i < amount) {
      //     i++;
      //     console.log('Starting one task');
      //     const workerEnv = {};
      //
      //     workerEnv['TASK_INDEX'] = i;
      //
      //     const worker = cluster.fork('./splash', [], { env: workerEnv });
      //     console.log('Started task');
      //   }
      //
      //   if (remaining > 0) {
      //     console.log('Starting remaining task');
      //     const workerEnv = {};
      //
      //     workerEnv['TASK_INDEX'] = amount + 1;
      //
      //     const worker = cluster.fork('./splash', [], { env: workerEnv });
      //     console.log('Started task');
      //   }

      await startTasks(tasks);
    }
  }
];




prompt.message = chalk.magenta('>');
prompt.delimiter = chalk.cyan(' ');

prompt.start();

function getAppMode() {
  console.log(chalk`Please select an {magenta Application Mode}\n` +
  chalk`1. {magenta Task Setup Mode}\n` +
  chalk`2. {magenta Product Mode}\n` +
  chalk`3. {magenta Splash Mode}`);
  prompt.get({
    properties: {
      mode: {
        description: 'App Mode',
        type: 'number',
        minimum: 1,
        maximum: 3,
        message: 'Must select valid option.',
        required: true
      }
    }
  }, (err, res) => {
    if (err) {
      console.log(err);
      process.exit(0);
    }

    const mode = res.mode - 1;
    return modes[mode].run();
  });
}

function loadTasks() {
  try {
    const content = fs.readFileSync('./config/tasks.json');
    const json = JSON.parse(content);
    tasks = json;
  } catch (e) {}
}

function saveTasks() {
  try {
    const data = JSON.stringify(tasks);

    fs.writeFileSync('./config/tasks.json', data, 'utf8');
  } catch (e) {
    console.log('Error saving tasks: ', e);
    process.exit(1);
  }
}

async function start() {
  await startCaptcha();
  loadTasks();
  console.log(`${tasks.length} tasks loaded.`);
  getAppMode();
}

start();

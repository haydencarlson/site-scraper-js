const config = require('./config');
const { Worker } = require('worker_threads');
const fs = require('fs');

const processedUrls = [];
let queuedUrls = [];
let cyclesSinceLastQueue = 0;

const worker = new Worker('./worker.js');
worker.on('error', (e) => console.log(e));
worker.on('message', (foundUrls) => {
  const filteredUrls = filterFoundUrls(foundUrls);
  queuedUrls.push(...filteredUrls);
  processedUrls.push(...filteredUrls);
});

setInterval(() => {
  if (cyclesSinceLastQueue === 150) finished();
  if (!queuedUrls.length) return cyclesSinceLastQueue += 1;
  const urlsForProcessing = [...queuedUrls];
  queuedUrls = [];
  processQueue(urlsForProcessing);
}, 1000);

function start(url) {
  console.log(`Starting: ${url} pushed to queue`);
  processQueue([url]);
}

function finished() {
  console.log(`No new URLs found recently. Writing ${processedUrls.length} URL's to file.`)
  fs.writeFileSync('./results.json', processedUrls.join('\n'));
  process.exit();
}

function processQueue(urls) {
  worker.postMessage(urls);
}

function filterFoundUrls(foundUrls) {
  // Filters out URLs that dont start with the baseUrl
  let filteredUrls = foundUrls.filter(url => url.startsWith(config.baseUrl));

  // Filter out URLs that were already processed
  filteredUrls = filteredUrls.filter(url => !processedUrls.includes(url));

  if (filteredUrls.length) {
    console.log(`Found ${filteredUrls.length} new links \n${filteredUrls.join('\n')}`);
  }

  return filteredUrls;
}


start(config.startUrl);
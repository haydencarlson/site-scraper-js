const { parentPort, isMainThread } = require('worker_threads');
const config = require('./config');
const axios = require('axios');
const jsdom = require('jsdom');
const BluebirdPromise = require('bluebird');
const { JSDOM, VirtualConsole } = jsdom;
const sleep = ms => new Promise(r => setTimeout(r, ms));

parentPort.on('message', processQueue);

function processQueue(urls) {
  BluebirdPromise.map(
    urls,
    processQueueUrl,
    {concurrency: 2}
  )
}

async function processQueueUrl(url) {
  const html = await requestUrl(url);
  if (!html) return;
  const dom = new JSDOM(
    html, 
    { 
      beforeParse: (window) => {
        window.performance.timing = {responseStart: new Date(), navigationStart: new Date()};
      },
      runScripts: 'dangerously', 
      resources: 'usable', 
      url,
      referrer: config.baseUrl,
      virtualConsole: new VirtualConsole
    }
  );
  await sleep(10000); // HACK: Wait for dynamic JS to execute
  getUrlsFromDom(dom, url);
  dom.window.close();
}

function getUrlsFromDom(dom) {
  const aTagList = dom.window.document.querySelectorAll('a');
  const aTagsArray = Array.from(aTagList);
  const urls = aTagsArray.map(a => a.href);
  parentPort.postMessage(urls);
};

async function requestUrl(url) {
  try {
    console.log(`Requesting page ${url}`);
    const { data } = await axios.get(url);
    return data;
  } catch(e) {
    console.log(`Error requesting ${url} Response code: ${e.response.status}`);
  }
};
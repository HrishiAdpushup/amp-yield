const puppeteer = require("puppeteer");
const fs = require("fs");
const treekill = require("treekill");
const nodeParse = require("node-html-parser");
const iPhonex = puppeteer.devices["iPhone X"];
const excelUtils = require("./utils/excelUtils");

const siteData = fs.readFileSync("./ampListPhaseThree.json", "utf-8");

const siteJson = JSON.parse(siteData);

const phaseThreeTags = fs.readFileSync("./ampTagsPhaseThree.json", "utf-8");
const phaseThreeTagsJson = JSON.parse(phaseThreeTags);

const batchSize = 30;
const ampTags = [];

const processSite = async (browser, site) => {
  let url = site.ampUrl.length ? site.ampUrl : site.ampUrl.text;
  console.log("Log :  ~ processSite ~ url", url)
  let compID = site.companyID;
  
  let siteName = site.companyName?.length
    ? site.companyName
    : site.companyName.text;
  if (!url?.includes("http://") && !url?.includes("https://")) {
    url = `http://${url}`;
  }

  try {
    if (url?.length === 0) return;
    let page = await browser.newPage();
    await page.emulate(iPhonex);
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForTimeout(3000);

    // uncomment this for screenshots
    await page.screenshot({ path: `./screenshotsNew/${compID}.jpeg` });

    const pageHTML = await page.content();
    const root = nodeParse.parse(pageHTML);

    let ampTag = root.querySelectorAll("amp-ad");
    let ampSticky = root.querySelector("amp-sticky-ad")?.toString();
    let ampAnalytics = root.querySelector("amp-analytics")?.toString();

    let metaTags = root.querySelectorAll("meta");
    let tagData = {
      id: compID,
      rtc: false,
      multi: false,
      refresh: false,
      sticky: false,
      analytics: false,
      tag: "",
      name: siteName,
    };

    ampTag.forEach((item, index) => {
      let realTag = item
        .toString()
        .substring(0, item.toString().indexOf(">") + 1);
      if (realTag.length > 0 && index === 0) tagData.tag = realTag;

      if (!tagData.rtc && realTag.includes("rtc-config")) {
        console.log("Rtc true for ", compID);
        tagData.rtc = true;
      }
      if (
        !tagData.multi &&
        realTag.includes("data-multi-size") &&
        !realTag.includes('data-multi-size-validation="false"')
      ) {
        console.log("Multi true for ", compID);
        tagData.multi = true;
      }
      if (!tagData.refresh && realTag.includes("data-enable-refresh")) {
        console.log("Refresh true for ", compID);
        tagData.refresh = true;
      }
    });

    if (!tagData.refresh) {
      metaTags.forEach((item) => {
        if (!tagData.refresh) {
          let realTag = item
            .toString()
            .substring(0, item.toString().indexOf(">") + 1);

          if (realTag.includes("amp-ad-enable-refresh")) {
            console.log("Refresh true for ", compID);
            tagData.refresh = true;
          }
        }
      });
    }

    if (ampSticky?.length > 0) {
      console.log("Sticky true for ", compID);
      tagData.sticky = true;
    }

    if (ampAnalytics?.length > 0) {
      console.log("Analytics true for ", compID);
      tagData.analytics = true;
    }

    ampTags.push(tagData);

    await page.close();
  } catch (e) {
    console.log("Error for ", compID, " with URL : ", url, " : ", e.message);
  }
};

const processSites = async (browser, sitesList, compList) => {
  const promises = sitesList.map((site, index) => processSite(browser, site));
  await Promise.all(promises);
};

const array_chunks = (array, chunk_size) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill()
    .map((_, index) => index * chunk_size)
    .map((begin) => array.slice(begin, begin + chunk_size));

async function batchScreenshots(sitesList) {
  const sitesBatch = array_chunks(sitesList, batchSize);
  let index = 0;
  for (let siteChunk of sitesBatch) {
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
    });
    index++;
    if (index <= 0) continue;
    console.log(`PROCESSING CHUNK ${index}`);
    await processSites(browser, siteChunk);
    await browser.close();
    try {
      treekill(browser.process().pid, "SIGKILL");
    } catch (error) {
      console.log({ error: "Cannot kill" });
    }
  }
  fs.writeFileSync("ampTagsPhaseThreeExtra.json", JSON.stringify({ tags: ampTags }));
}

batchScreenshots(siteJson.comps);

//  Excel to Json Convert
// excelUtils
//   .fetchUrlDataFromExcel("./amp-outreach-phase-3.xlsx", "sheet1")
//   .then((comps) => {
//     fs.writeFileSync("ampListPhaseThree.json", JSON.stringify({ comps }));
//   })
//   .catch((err) => console.log(err));

//  add Score data to Excel file
// excelUtils.addScoreDataToExcel(
//   "./amp-outreach-phase-3.xlsx",
//   "sheet1",
//   phaseThreeTagsJson.tags
// );



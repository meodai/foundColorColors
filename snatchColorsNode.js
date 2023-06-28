import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://foundcolor.co/');
  
  // recursively get all detail links from all overview pages
  const getDetailLinks = async (url) => {
    console.log(`visiting ${url}...`);
    await page.goto(url);
    const detailLinks = await page.evaluate(_ => {
      return Promise.resolve(
        Array.from(document.querySelectorAll('.posts > a')).map($el => {
          return $el.href;
        })
      );
    });
    const nextLink = await page.evaluate(_ => {
      return Promise.resolve(
        document.querySelector('.pagination a.next') ?
        document.querySelector('.pagination a.next').href : null
      );
    });
    if (nextLink) {
      return detailLinks.concat(await getDetailLinks(nextLink));
    } else {
      return detailLinks;
    }
  };

  const detailLinks = await getDetailLinks('https://foundcolor.co/');

  console.log(`found ${detailLinks.length} detail links...`);

  // get all palettes from all detail pages
  const getPalettes = async (url) => {
    console.log(`visiting ${url}...`);
    await page.goto(url);

    console.log(`snatching palette from ${url}...`);
    return await page.evaluate(_ => {

      const $wrap = document.querySelector('#color-scheme');
      const c1 = $wrap.dataset.col1;
      const c2 = $wrap.dataset.col2;
      const c3 = $wrap.dataset.col3;

      const c1name = $wrap.querySelector('#color0').innerHTML.split('<br>')[0].trim();
      const c2name = $wrap.querySelector('#color1').innerHTML.split('<br>')[0].trim();
      const c3name = $wrap.querySelector('#color2').innerHTML.split('<br>')[0].trim();

      const imgSrc = $wrap.querySelector('.img-container .col-img').src;

      return Promise.resolve({
        insta: $wrap.dataset.insta,
        img: imgSrc,
        colors: [{
          name: c1name,
          value: c1,
        }, {
          name: c2name,
          value: c2,
        }, {
          name: c3name,
          value: c3,
        }],
      });
    });
  };

  const palettes = [];
  
  for (let i = 0; i < detailLinks.length; i++) {
    console.log(`Snatching palette ${i + 1} of ${detailLinks.length}...`);
    const palette = await getPalettes(detailLinks[i]);
    palettes.push(palette);
  }

  await browser.close();

  console.log(`writing palettes to palettes.json...`);
  fs.writeFileSync('./palettes.json', JSON.stringify(palettes, null, 2));
})();
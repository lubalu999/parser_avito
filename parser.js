const puppeteer = require("puppeteer");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

async function findInfoAboutProduct(browser, link) {
  await delay(1000); // задержка 1 секунда
  const page = await browser.newPage();
  try {
    await page.goto(link, { waitUntil: "networkidle2" }); // ожидание полной загрузки страницы

    const title = await page
      .$eval('[data-marker="item-view/title-info"]', (el) => el.innerText)
      .catch(() => null);
    const price = await page
      .$eval('[data-marker="item-view/item-price"]', (el) => el.innerText)
      .catch(() => null);
    const marketer = await page
      .$eval('[data-marker="seller-link/link"]', (el) => el.innerText)
      .catch(() => null);
    const creationDate = await page
      .$eval('[data-marker="item-view/item-date"]', (el) => el.innerText)
      .catch(() => null);
    const totalViews = await page
      .$eval('[data-marker="item-view/total-views"]', (el) => el.innerText)
      .catch(() => null);
    const todayViews = await page
      .$eval('[data-marker="item-view/today-views"]', (el) => el.innerText)
      .catch(() => null);

    return {
      title,
      price,
      marketer,
      creationDate,
      totalViews,
      todayViews,
    };
  } finally {
    await page.close(); // закрываем страницу после парсинга
  }
}

(async () => {
  const url = "https://www.avito.ru/moskva/produkty_pitaniya";

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--disable-images", "--no-sandbox"],
  });
  const page = await browser.newPage();

  // Включаем перехват запросов для блокировки ненужных ресурсов
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const blockResources = ["image", "stylesheet", "font"];
    if (blockResources.includes(req.resourceType())) {
      req.abort(); // Блокируем запрос
    } else {
      req.continue(); // Разрешаем остальные запросы
    }
  });

  const pagesInfo = [];
  for (let i = 1; i <= 5; i++) {
    await page.goto(`${url}?p=${i}`, { waitUntil: "networkidle2" });

    const links = [];
    const items = await page.$$('div[data-marker="item"]'); // Получаем все элементы товаров

    for (let i = 0; i < items.length; i++) {
      const product = items[i]; // Получаем текущий элемент
      const link = await product.$eval("a", (a) => a.href).catch(() => null); // Извлекаем ссылку

      if (link) {
        links.push(link);
      }
    }

    const pLimit = await import("p-limit"); // Динамический импорт
    const limit = pLimit.default(5); // Ограничение до 5 параллельных запросов

    const infoPromises = links.map((link) =>
      limit(() => findInfoAboutProduct(browser, link))
    );
    const productsInfo = await Promise.all(infoPromises);

    console.log(productsInfo);
    pagesInfo.push(productsInfo);
  }

  await browser.close();
})();

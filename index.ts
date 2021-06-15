import { Builder, By, WebDriver } from "selenium-webdriver";
import { WindowsToaster } from "node-notifier";
import { launch } from "chrome-launcher";
import { Options } from "selenium-webdriver/chrome";

const url = "https://shop.nvidia.com/fr-fr/geforce/store/?page=1&limit=9&locale=fr-fr&gpu=RTX%203070%20Ti,RTX%203070,RTX%203080&manufacturer=NVIDIA&manufacturer_filter=NVIDIA~3,ACER~0,ALIENWARE~0,AORUS~0,ASUS~4,DELL~0,EVGA~10,GAINWARD~2,GIGABYTE~9,HP~0,INNO3D~0,MSI~9,PALIT~5,PNY~4,RAZER~0,ZOTAC~1";
const selectorResults = "div.total-products-text > div";

interface Stock {
    name: string;
    selector: string;
    stock?: boolean;
}

let driver: WebDriver;

const stockSelectors : Stock[] =
    [{
        name: "RTX 3080", selector: "div.NVGFT080 ~ a"
    },
    {
        name: "RTX 3070", selector: "div.NVGFT070 ~ a"
    },
    {
        name: "RTX 3070 TI", selector: "div.NVGFT070T ~ a"
    }];

async function init() {
    driver = await new Builder().forBrowser('chrome').setChromeOptions(new Options().addArguments("--disable-extensions")).build();
    await driver.get(url);
}

async function checkStock() {
    await driver.manage().deleteAllCookies();
    await driver.navigate().refresh();
    try {
        const result = await driver.findElement(By.css(selectorResults)).getText();
        if(!result.includes("3")) throw Error();
    } catch(e) {
        console.error("Site inaccessible, réinitialisation driver...");
        await reinit();
    }
    const promises = stockSelectors.map(async card => {
        const text = await driver.findElement(By.css(card.selector)).getText();
        card.stock = !text.includes("RUPTURE DE STOCK");
        return card;
    });
    const result = await Promise.all(promises);
    result.forEach(r => {
        console.log(new Date().toLocaleString() + " - " + r.name + " : " + (r.stock ? "EN STOCK" : "rupture"));
        if (r.stock) {
            notification("EN STOCK " + r.name);
        }
    });
}

async function reinit() {
    if (driver) await driver.close();
    await init();
}

function notification(message: string) {
    const toast = new WindowsToaster();
    toast.notify({
        title: "CHECK RTX",
        message: message,
        sound: true,
        wait: true
    }, () => {
        launch({
            startingUrl: url
        });
    });

}

async function exit() {
    if (driver) await driver.close();
}

async function main() {
    await init();
    await checkStock();
    setInterval(checkStock, 30000);
}

process.stdin.resume();//so the program will not close instantly

function exitHandler(options: {exit: boolean}, exitCode: number) {
    exit();
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{exit: false}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

main();
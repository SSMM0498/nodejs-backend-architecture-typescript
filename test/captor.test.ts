import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import 'mocha';
import * as puppeteer from 'puppeteer';
import { Suite } from 'mocha';
var assert = require('assert')

const htmlFolder = path.join(__dirname, 'html');
const htmls = fs.readdirSync(htmlFolder).map(filePath => {
    const raw = fs.readFileSync(path.resolve(htmlFolder, filePath), 'utf-8');
    return {
        filePath,
        src: raw,
    };
});

const htmlJSONFolder = path.join(__dirname, 'out');
const htmlsJSON = fs.readdirSync(htmlJSONFolder).map(filePath => {
    const raw = fs.readFileSync(path.resolve(htmlJSONFolder, filePath), 'utf-8');
    return {
        filePath,
        src: raw,
    };
});

interface IMimeType {
    [key: string]: string;
}

const server = () => new Promise<http.Server>(resolve => {
    const mimeType: IMimeType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };
    //  Create a http server
    const s = http.createServer((req, res) => {
        //  Retrieves the path name from the url
        const parsedUrl = url.parse(req.url!);
        const sanitizePath = path.normalize(parsedUrl.pathname!).replace(/^(\.\.[\/\\])+/, '');
        let pathname = path.join(__dirname, sanitizePath);
        try {
            const data = fs.readFileSync(pathname);
            const ext = path.parse(pathname).ext;
            res.setHeader('Content-type', mimeType[ext] || 'text/plain'); // Indicates the media type of the resource.
            res.setHeader('Access-Control-Allow-Origin', '*'); // Indicates whether res can be shared.
            res.setHeader('Access-Control-Allow-Methods', 'GET'); // Specifies the methods allowed when accessing the resource in res to a preflight request.
            res.setHeader('Access-Control-Allow-Headers', 'Content-type'); // Indicates which headers can be exposed as part of the response by listing their names.
            res.end(data);
        } catch (error) {
            res.end();
        }
    });

    // Listen with server
    s.listen(3030).on('listening', () => {
        resolve(s);
    });
});

interface ISuite extends Suite {
    server: http.Server;
    browser: puppeteer.Browser;
}

describe('node captor tests', function (this: ISuite) {
    before(async () => {
        this.server = await server();
        this.browser = await puppeteer.launch({/*headless: false,*/ });
    });

    after(async () => {
        await this.browser.close();
        await this.server.close();
    });

    for (const html of htmls) {
        const title = '[html file]: ' + html.filePath;
        it(title, async () => {
            const page: puppeteer.Page = await this.browser.newPage();
            page.on('console', msg => console.log(msg.text()));
            await page.goto(`http://localhost:3030/html`);
            await page.setContent(html.src, {
                waitUntil: 'load',
            });
            assert.equal(2 + 2, 4, 'Done');
        }) //.timeout(5000);
    }
});

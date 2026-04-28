import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

globalThis.window = dom.window as any;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;

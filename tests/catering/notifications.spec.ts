import { expect, test } from "@playwright/test";

test("Mercure reconnect refreshes unread notifications without a console error", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      user: { uuid: "00000000-0000-4000-8000-000000000001" },
      modules: ["events"], accesses: ["events"], permissions: ["events.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript((value) => {
    localStorage.setItem("auth_token", value);
    class TestEventSource extends EventTarget {
      static CLOSED = 2;
      readyState = 0;
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage = null;
      constructor(url: string) {
        super();
        if (new URL(url).searchParams.has("topic")) {
          Object.assign(window, { notificationSource: this });
        }
      }
      close() { this.readyState = TestEventSource.CLOSED; }
    }
    Object.assign(window, { EventSource: TestEventSource });
  }, token);
  let unreadRequests = 0;
  await page.route("**/api/**", (route) => {
    if (route.request().url().includes("/notification-messages/unread-count")) {
      unreadRequests++;
      return route.fulfill({ json: { data: { unreadCount: unreadRequests } } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/catering/events");
  await expect.poll(() => unreadRequests).toBeGreaterThan(0);
  const beforeReconnect = unreadRequests;
  await page.evaluate(() => {
    const source = (window as unknown as {
      notificationSource: { readyState: number; onerror: () => void; onopen: () => void };
    }).notificationSource;
    source.readyState = 0;
    source.onerror();
    source.readyState = 1;
    source.onopen();
  });
  await expect.poll(() => unreadRequests).toBeGreaterThan(beforeReconnect);
  expect(errors.filter((message) => /Mercure error|readyState:/.test(message))).toEqual([]);
});

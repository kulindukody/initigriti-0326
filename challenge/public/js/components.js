window.Auth = window.Auth || {};

window.Auth.loginRedirect = function (data) {
    console.log("[Auth] Callback received data:", data);
    let config = window.authConfig || {
        dataset: {
            next: '/',
            append: 'false'
        }
    };

    let redirectUrl = config.dataset.next || '/';

    if (config.dataset.append === 'true') {
        let delimiter = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += delimiter + "token=" + encodeURIComponent(document.cookie);
    }

    console.log("[Auth] Redirecting to:", redirectUrl);
    window.location.href = redirectUrl;
};

class ComponentManager {
    static init() {
        document.querySelectorAll('[data-component="true"]').forEach(element => {
            this.loadComponent(element);
        });
    }

    static loadComponent(element) {
        try {
            let rawConfig = element.getAttribute('data-config');
            if (!rawConfig) return;

            let config = JSON.parse(rawConfig);
            let basePath = config.path || '/components/';
            let compType = config.type || 'default';

            let scriptUrl = basePath + compType + '.js';

            console.log("[ComponentManager] Loading chunk:", scriptUrl);

            let s = document.createElement('script');
            s.src = scriptUrl;
            document.head.appendChild(s);

        } catch (e) {
            console.error("[ComponentManager] Failed to bind component:", e);
        }
    }
}

window.ComponentManager = ComponentManager;

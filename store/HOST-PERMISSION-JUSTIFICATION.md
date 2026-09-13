# Host permission justification

Marginalia uses access to permitted HTTP and HTTPS websites to provide user-requested annotations and automatically restore saved highlights on return visits. Its packaged content script checks the current URL against locally saved readings and processes page text to locate annotated passages. When users enable the panel, they can select text and save notes. Broad website matching supports user-chosen articles, course resources, and reading sites rather than a fixed set of domains. The extension does not persist a general browsing-history log or upload browsing activity to a developer server.

This justification describes `content_scripts.matches` (`http://*/*` and `https://*/*`) in the current manifest. There is no separate `host_permissions` entry. See [the privacy disclosures](PRIVACY-DISCLOSURES.md) and [the privacy audit](PRIVACY-AUDIT.md) for local data handling and the visibility of on-page notes to website scripts.

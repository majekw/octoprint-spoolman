$(() => {
    // from setup.py plugin_identifier
    const PLUGIN_ID = "Spoolman";

    function SpoolmanSettingsViewModel(params) {
        const self = this;

        self.settingsViewModel = params[0];
        self.pluginSettings = null;

        self.onBeforeBinding = () => {
            self.pluginSettings = self.settingsViewModel.settings.plugins[PLUGIN_ID];
        };

        // New observables for testing connection
        self.testConnectionText = ko.observable("Test Connection");
        self.testConnectionResult = ko.observable("");
        self.testConnectionSuccess = ko.observable(false);

        // Test connection function
        self.testConnection = function() {
            self.testConnectionText("Testing...");
            self.testConnectionResult("");

            const payload = {
                spoolmanUrl: self.pluginSettings.spoolmanUrl(),
                isSpoolmanCertVerifyEnabled: self.pluginSettings.isSpoolmanCertVerifyEnabled(),
                spoolmanCertPemPath: self.pluginSettings.spoolmanCertPemPath(),
                useApiKey: self.pluginSettings.useApiKey(),
                apiKey: self.pluginSettings.apiKey()
            };

            OctoPrint.API.post("plugin/Spoolman/test_connection", payload)
                .done((response) => {
                    if (response.data) {
                        self.testConnectionResult(response.data.message || "Connection successful");
                        self.testConnectionSuccess(true);
                    } else if (response.error) {
                        const errorMessages = {
                            'spoolman_api__instance_url_empty': 'Spoolman URL is not configured',
                            'spoolman_api__ssl_error': 'SSL certificate verification failed',
                            'spoolman_api__connection_timeout': 'Connection timed out',
                            'spoolman_api__connection_failed': 'Unable to connect to Spoolman server',
                            'spoolman_api__unknown': 'An unknown error occurred',
                            'spoolman_api__request_failed': 'Request failed - check URL and API key',
                            'spoolman_api__spool_not_found': 'Spool not found'
                        };
                        const errorMsg = errorMessages[response.error.code] || `Error: ${response.error.code}`;
                        self.testConnectionResult(errorMsg);
                        self.testConnectionSuccess(false);
                    }
                })
                .fail((xhr) => {
                    self.testConnectionResult("Connection failed: " + (xhr.responseText || xhr.statusText));
                    self.testConnectionSuccess(false);
                })
                .always(() => {
                    self.testConnectionText("Test Connection");
                });
        };
    };

    OCTOPRINT_VIEWMODELS.push({
        construct: SpoolmanSettingsViewModel,
        dependencies: [
            "settingsViewModel"
        ],
        elements: [
            document.querySelector("#settings_spoolman"),
        ]
    });
});

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
            
            // Get current values from the dialog (not saved settings)
            const currentSettings = {
                spoolmanUrl: self.pluginSettings.spoolmanUrl(),
                isSpoolmanCertVerifyEnabled: self.pluginSettings.isSpoolmanCertVerifyEnabled(),
                spoolmanCertPemPath: self.pluginSettings.spoolmanCertPemPath(),
                useApiKey: self.pluginSettings.useApiKey(),
                apiKey: self.pluginSettings.apiKey()
            };
            
            $.ajax({
                url: "/plugin/Spoolman/test_connection",
                type: "POST",
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(currentSettings),
                success: function(data) {
                    if (data.data) {
                        self.testConnectionResult(data.data.message || "Connection successful");
                        self.testConnectionSuccess(true);
                    } else if (data.error) {
                        // Format error message to be more human-readable
                        let errorMsg = "Connection failed";
                        if (data.error.message) {
                            errorMsg = data.error.message;
                        } else if (data.error.code) {
                            // Convert error codes to human-readable messages (exact codes from SpoolmanConnector.py)
                            const errorMessages = {
                                'spoolman_api__instance_url_empty': 'Spoolman URL is not configured',
                                'spoolman_api__ssl_error': 'SSL certificate verification failed',
                                'spoolman_api__connection_timeout': 'Connection timed out',
                                'spoolman_api__connection_failed': 'Unable to connect to Spoolman server',
                                'spoolman_api__unknown': 'An unknown error occurred',
                                'spoolman_api__request_failed': 'Request failed - check URL and API key',
                                'spoolman_api__spool_not_found': 'Spool not found'
                            };
                            errorMsg = errorMessages[data.error.code] || `Error: ${data.error.code}`;
                        }
                        self.testConnectionResult(errorMsg);
                        self.testConnectionSuccess(false);
                    }
                },
                error: function(xhr) {
                    self.testConnectionResult("Connection failed: " + (xhr.responseText || xhr.statusText));
                    self.testConnectionSuccess(false);
                },
                complete: function() {
                    self.testConnectionText("Test Connection");
                }
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

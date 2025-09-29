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
            $.ajax({
                url: "/plugin/Spoolman/test_connection", // Use the correct endpoint
                type: "POST",
                dataType: "json",
                success: function(data) {
                    if (data.data) {
                        self.testConnectionResult(data.data.message);
                        self.testConnectionSuccess(true);
                    } else if (data.error) {
                        self.testConnectionResult("Error: " + data.error.code);
                        self.testConnectionSuccess(false);
                    }
                },
                error: function(xhr) {
                    self.testConnectionResult("Connection failed: " + xhr.statusText);
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

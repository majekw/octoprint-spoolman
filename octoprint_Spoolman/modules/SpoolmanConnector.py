# coding=utf-8
from __future__ import absolute_import

import requests
from requests.adapters import HTTPAdapter, Retry

class SpoolmanConnector():
    def __init__(self, instanceUrl, logger, verifyConfig, useApiKey = False, apiKey = ""):
        self.instanceUrl = self._cleanupInstanceUrl(instanceUrl)
        self._logger = logger
        self.verifyConfig = verifyConfig
        self.useApiKey = useApiKey
        self.apiKey = apiKey

    def _cleanupInstanceUrl(self, value):
        trailingSlash = "/"

        if value.endswith(trailingSlash):
            value = value[:-len(trailingSlash)]

        return value

    def _createSpoolmanApiUrl(self):
        apiPath = "/api/v1"

        return self.instanceUrl + apiPath

    def _createSpoolmanEndpointUrl(self, endpoint):
        return self._createSpoolmanApiUrl() + endpoint;

    def _logSpoolmanCall(self, endpointUrl):
        self._logger.debug("[Spoolman API] calling endpoint %s" % endpointUrl)

    def _logSpoolmanSuccess(self, response):
        self._logger.debug("[Spoolman API] request succeeded with status %s" % response.status_code)

    def _handleSpoolmanConnectionError(self, caughtException):
        self._logger.error("[Spoolman API] connection failed with %s" % caughtException)

        if isinstance(caughtException, requests.exceptions.SSLError):
            code = "spoolman_api__ssl_error"
        elif isinstance(caughtException, requests.exceptions.Timeout):
            code = "spoolman_api__connection_timeout"
        elif isinstance(caughtException, requests.exceptions.RequestException):
            code = "spoolman_api__connection_failed"
        else:
            code = "spoolman_api__unknown"

        return {
            "error": {
                "code": code,
            },
        }

    # Helper to build headers
    def _buildHeaders(self):
        headers = {}
        if self.useApiKey and self.apiKey:
            headers["X-Api-Key"] = self.apiKey
        return headers

    def _call_api(self, method, endpoint, timeout=10):
        precheckResult = self._precheckSpoolman()
        if precheckResult:
            return precheckResult

        endpointUrl = self._createSpoolmanEndpointUrl(endpoint)
        self._logSpoolmanCall(endpointUrl)

        headers = self._buildHeaders()
        try:
            response = requests.request(method, endpointUrl, verify=self.verifyConfig, headers=headers, timeout=timeout)
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.SSLError as e:
            return self._handleSpoolmanConnectionError(e)
        except requests.exceptions.Timeout as e:
            return self._handleSpoolmanConnectionError(e)
        except requests.exceptions.RequestException as e:
            return self._handleSpoolmanConnectionError(e)

        self._logSpoolmanSuccess(response)
        return {"data": response.json()}

    def handleGetSpoolsAvailable(self):
        result = self._call_api("GET", "/spool")
        if "error" in result:
            return result
        return {"data": {"spools": result["data"]}}

    def handleCommitSpoolUsage(self, spoolId, spoolUsedLength):
        spoolIdStr = str(spoolId)
        endpoint = f"/spool/{spoolIdStr}/use"

        # Using a session for retries
        session = requests.Session()
        session.verify = self.verifyConfig
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
        session.mount(self.instanceUrl, HTTPAdapter(max_retries=retries))

        try:
            response = session.put(
                self._createSpoolmanEndpointUrl(endpoint),
                json={'use_length': spoolUsedLength},
                timeout=1,
                headers=self._buildHeaders()
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            if e.response and e.response.status_code == 404:
                return {
                    "error": {
                        "code": "spoolman_api__spool_not_found",
                        "spoolman_api": {"status_code": e.response.status_code},
                        "data": {"spoolId": spoolIdStr, "usedLength": spoolUsedLength},
                    }
                }
            return self._handleSpoolmanConnectionError(e)

        self._logSpoolmanSuccess(response)
        return {"data": {}}

    def handleTestConnection(self):
        result = self._call_api("GET", "/spool", timeout=5)
        if "error" in result:
            return result
        return {"data": {"message": "Connection successful"}}

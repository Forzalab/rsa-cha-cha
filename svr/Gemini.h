#pragma once

#include <curl/curl.h>
#include <nlohmann/json.hpp>

#include <cstdlib>
#include <iostream>
#include <string>

struct GeminiReply {
    bool ok = false;
    std::string text;
};

inline bool gemini_configured() {
    const char* key = std::getenv("GEMINI_API_KEY");
    return key && *key;
}

inline std::size_t gemini_write(char* data, std::size_t size, std::size_t count, void* output) {
    static_cast<std::string*>(output)->append(data, size * count);
    return size * count;
}

inline GeminiReply ask_kerney(const std::string& username, const std::string& message) {
    const char* key = std::getenv("GEMINI_API_KEY");
    if (!key || !*key) return {false, "Gemini is not configured on the server."};

    static const bool curl_ready = [] { return curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK; }();
    if (!curl_ready) return {false, "Could not initialize HTTP support."};
    CURL* curl = curl_easy_init();
    if (!curl) return {false, "Could not initialize the Gemini request."};

    const std::string prompt =
        "You are a fictional classroom chat bot named Kerney, not the real professor. "
        "Reply to the student's message in one to three concise sentences. Relate the answer "
        "to C++ programming, compilers, pointers, memory, templates, or debugging. Be witty and "
        "mildly passive-aggressive, but never cruel, discriminatory, threatening, or profane. "
        "Do not claim to be a real person. Student " + username + " wrote: " + message;

    nlohmann::json body = {
        {"contents", nlohmann::json::array({
            {{"role", "user"}, {"parts", nlohmann::json::array({{{"text", prompt}}})}}
        })},
        {"generationConfig", {{"temperature", 0.85}, {"maxOutputTokens", 160}}}
    };

    std::string response;
    char curl_error[CURL_ERROR_SIZE] = {};
    struct curl_slist* headers = nullptr;
    const std::string auth = std::string("x-goog-api-key: ") + key;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, auth.c_str());

    const char* configured_model = std::getenv("GEMINI_MODEL");
    const std::string model = configured_model && *configured_model
        ? configured_model
        : "gemini-3.1-flash-lite";
    const std::string endpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    curl_easy_setopt(curl, CURLOPT_URL, endpoint.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    const std::string payload = body.dump();
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(payload.size()));
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, gemini_write);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_ERRORBUFFER, curl_error);
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 5L);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 20L);

    const CURLcode result = curl_easy_perform(curl);
    long status = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    if (result != CURLE_OK) {
        const std::string detail = curl_error[0] ? curl_error : curl_easy_strerror(result);
        std::cerr << "Gemini transport error: " << detail << "\n";
        return {false, "Gemini network error: " + detail};
    }
    if (status < 200 || status >= 300) {
        std::string detail = "HTTP " + std::to_string(status);
        const auto error_json = nlohmann::json::parse(response, nullptr, false);
        if (!error_json.is_discarded()) {
            try {
                const std::string api_message = error_json.at("error").at("message").get<std::string>();
                if (!api_message.empty()) detail += ": " + api_message.substr(0, 500);
            } catch (...) {}
        }
        std::cerr << "Gemini API error: " << detail << "\n";
        return {false, detail};
    }

    const auto parsed = nlohmann::json::parse(response, nullptr, false);
    if (parsed.is_discarded()) return {false, "Gemini returned invalid JSON."};
    try {
        const std::string text = parsed.at("candidates").at(0).at("content").at("parts").at(0).at("text").get<std::string>();
        return {!text.empty(), text};
    } catch (...) {
        return {false, "Gemini returned no answer."};
    }
}

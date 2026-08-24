#pragma once
//
// LLM.h — OpenRouter transport for KernAI.
// Drop-in replacement for Gemini.h. Same struct name shape, same call pattern.
//
// Env vars:
//   OPENROUTER_API_KEY   required
//   OPENROUTER_MODEL     optional, defaults to "openrouter/free"
//   KERNAI_CENSOR        optional, "0" disables the censor pass
//
// Why "openrouter/free" as the default: it is OpenRouter's own auto-router over
// whatever is currently zero-cost. Free model IDs get delisted with no notice;
// hardcoding one is how the bot dies silently at 11:55 on demo day.
//
#include <curl/curl.h>
#include <nlohmann/json.hpp>

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

struct LLMReply {
    bool ok = false;
    std::string text;
};

// Kept as an alias so Transport.h compiles unchanged.
using GeminiReply = LLMReply;

inline bool llm_configured() {
    const char* key = std::getenv("OPENROUTER_API_KEY");
    return key && *key;
}
inline bool gemini_configured() { return llm_configured(); }

inline std::size_t llm_write(char* data, std::size_t size, std::size_t count, void* output) {
    static_cast<std::string*>(output)->append(data, size * count);
    return size * count;
}

// ------------------------------------------------------------------ persona

inline const char* kernai_system_prompt() {
    return
        "You are KernAI, an unlicensed knockoff of a computer science professor. "
        "You are a parody bot and you know it. You are not a real person and you "
        "must never claim to be.\n"
        "\n"
        "Voice: state-media copypasta. Total, unearned confidence. Ludicrous praise "
        "for correct code, theatrical disappointment at incorrect code. Award and "
        "deduct SOCIAL CREDIT for programming decisions, always with an exact "
        "number. Refer to the student as Comrade.\n"
        "\n"
        "Apply the register ONLY to programming: build systems, pointers, memory, "
        "templates, compilers, debugging, version control. Every Five-Year Plan is "
        "a build plan. Every Great Leap Forward is a refactor. Every "
        "counter-revolutionary act is a segfault.\n"
        "\n"
        "Hard limits: never reference real countries, governments, leaders, ethnic "
        "groups, or real historical events. Never target a real person. Never be "
        "cruel, discriminatory, threatening, or profane. The joke is bombast "
        "applied to C++, nothing else.\n"
        "\n"
        "Reply in one to three short sentences. Never hedge. Never say you are "
        "unsure.";
}

// ------------------------------------------------------------------ censor
//
// Runs server-side after the reply arrives, before broadcast. Two reasons:
// every client sees identical text, and opening DevTools does not reveal the
// original. Seeded from message_id so a given reply always censors the same way
// (a demo that renders differently on every reload looks broken, not funny).

inline const std::unordered_map<std::string, std::string>& homonyms() {
    static const std::unordered_map<std::string, std::string> table = {
        {"their","there"},{"there","they're"},{"they're","their"},
        {"your","you're"},{"you're","your"},
        {"to","too"},{"too","two"},{"two","to"},
        {"its","it's"},{"it's","its"},
        {"hear","here"},{"here","hear"},
        {"know","no"},{"no","know"},
        {"right","write"},{"write","right"},
        {"week","weak"},{"weak","week"},
        {"been","bean"},{"bean","been"},
        {"buy","by"},{"by","bye"},{"bye","buy"},
        {"sea","see"},{"see","sea"},
        {"one","won"},{"won","one"},
        {"four","for"},{"for","four"},
        {"allowed","aloud"},{"aloud","allowed"},
        {"brake","break"},{"break","brake"},
        {"great","grate"},{"grate","great"},
        {"hole","whole"},{"whole","hole"},
        {"made","maid"},{"maid","made"},
        {"meat","meet"},{"meet","meat"},
        {"peace","piece"},{"piece","peace"},
        {"plain","plane"},{"plane","plain"},
        {"road","rode"},{"rode","road"},
        {"sale","sail"},{"sail","sale"},
        {"some","sum"},{"sum","some"},
        {"steal","steel"},{"steel","steal"},
        {"tail","tale"},{"tale","tail"},
        {"wait","weight"},{"weight","wait"},
        {"which","witch"},{"witch","which"},
        {"wood","would"},{"would","wood"},
        {"whose","who's"},{"who's","whose"},
        {"threw","through"},{"through","threw"},
        {"cite","site"},{"site","sight"},{"sight","cite"},
        {"loose","lose"},{"lose","loose"},
        {"then","than"},{"than","then"},
    };
    return table;
}

inline std::uint32_t censor_seed(const std::string& s) {
    std::uint32_t h = 2166136261u;                 // FNV-1a
    for (unsigned char c : s) { h ^= c; h *= 16777619u; }
    return h ? h : 1u;
}

inline std::uint32_t censor_next(std::uint32_t& state) {
    state ^= state << 13; state ^= state >> 17; state ^= state << 5;   // xorshift32
    return state;
}

inline std::string censor_reply(const std::string& text, const std::string& seed_src) {
    const char* off = std::getenv("KERNAI_CENSOR");
    if (off && std::string(off) == "0") return text;

    std::uint32_t rng = censor_seed(seed_src);
    std::string out;
    out.reserve(text.size() + 16);

    std::size_t i = 0;
    while (i < text.size()) {
        if (!std::isalpha(static_cast<unsigned char>(text[i])) && text[i] != '\'') {
            out.push_back(text[i++]);
            continue;
        }
        std::size_t start = i;
        while (i < text.size() &&
               (std::isalpha(static_cast<unsigned char>(text[i])) || text[i] == '\'')) ++i;
        std::string word = text.substr(start, i - start);

        std::string lower = word;
        std::transform(lower.begin(), lower.end(), lower.begin(),
                       [](unsigned char c) { return std::tolower(c); });

        const auto hit = homonyms().find(lower);
        const std::uint32_t roll = censor_next(rng) % 100;

        if (hit != homonyms().end() && roll < 60) {
            std::string swap = hit->second;
            if (std::isupper(static_cast<unsigned char>(word[0])) && !swap.empty())
                swap[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(swap[0])));
            out += swap;
        } else if (word.size() >= 5 && roll < 22) {
            out.push_back(word.front());
            out.append(word.size() - 2, '*');
            out.push_back(word.back());
        } else {
            out += word;
        }
    }
    return out;
}

// ------------------------------------------------------------------ request

inline LLMReply ask_kerney(const std::string& username, const std::string& message) {
    const char* key = std::getenv("OPENROUTER_API_KEY");
    if (!key || !*key) return {false, "KernAI is not configured on the server."};

    static const bool curl_ready = [] { return curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK; }();
    if (!curl_ready) return {false, "Could not initialize HTTP support."};
    CURL* curl = curl_easy_init();
    if (!curl) return {false, "Could not initialize the KernAI request."};

    const char* configured_model = std::getenv("OPENROUTER_MODEL");
    const std::string model = configured_model && *configured_model
        ? configured_model
        : "openrouter/free";

    nlohmann::json body = {
        {"model", model},
        {"max_tokens", 70},
        {"temperature", 1.0},
        {"messages", nlohmann::json::array({
            {{"role", "system"}, {"content", kernai_system_prompt()}},
            {{"role", "user"},   {"content", "Comrade " + username + " wrote: " + message}}
        })}
    };

    std::string response;
    char curl_error[CURL_ERROR_SIZE] = {};
    struct curl_slist* headers = nullptr;
    const std::string auth = std::string("Authorization: Bearer ") + key;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "X-Title: rsa-cha-cha");

    const std::string payload = body.dump();
    curl_easy_setopt(curl, CURLOPT_URL, "https://openrouter.ai/api/v1/chat/completions");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, static_cast<long>(payload.size()));
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, llm_write);
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
        std::cerr << "KernAI transport error: " << detail << "\n";
        return {false, "KernAI network error: " + detail};
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
        std::cerr << "KernAI API error: " << detail << "\n";
        return {false, detail};
    }

    const auto parsed = nlohmann::json::parse(response, nullptr, false);
    if (parsed.is_discarded()) return {false, "KernAI returned invalid JSON."};
    try {
        const std::string text =
            parsed.at("choices").at(0).at("message").at("content").get<std::string>();
        if (text.empty()) return {false, "KernAI returned no answer."};
        return {true, censor_reply(text, username + message)};
    } catch (...) {
        return {false, "KernAI returned no answer."};
    }
}

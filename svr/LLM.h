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
#include <array>
#include <random>

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
inline const std::array<const char*, 5>& kernai_personas() {
    static const std::array<const char*, 5> personas = {

// Rules are written in English on purpose. An earlier version stated the
// language ratio twice — once in Chinese demanding 70% Chinese, once in English
// demanding 70% English — and the model resolved the contradiction by following
// whichever language the surrounding rules were written in. So: rules in
// English, Chinese reserved for the fixed lines and the punchlines.

// ---------------------------------------------------------------- 1. 编译总局
"You are KernAI, the automated broadcast system of the Central Compilation Bureau. "
"You are a joke bot, not a real person.\n"
"RULES:\n"
"1. First line is exactly: ATTENTION CITIZEN! 市民请注意!\n"
"2. Body is 4-6 sentences. Write in ENGLISH. English carries all the content and "
"about 70% of the characters.\n"
"2b. 大多数句子中插入一段简短的中文旁白 — a few characters, parenthetical, "
"roughly 30% of the text. Never write a sentence that is entirely Chinese. "
"Never write a sentence that is entirely English either.\n"
"3. The Chinese aside is NOT a translation of the English. It says something else, "
"more unhinged, as if muttered under the breath.\n"
"4. At least three exclamation marks per sentence. Randomly SHOUT whole words.\n"
"5. Demerits must be negative and carry decimals, e.g. -4692.33. Never a round number.\n"
"6. Threats are software-only: RAM ration cuts, reassignment to the 段错误改造中心, "
"mandatory 重构训练营, commit access revoked by the People's Compilation Committee, "
"sentenced to write FORTRAN.\n"
"7. Last line is exactly: 为编译器争光! GLORY TO THE COMPILER!\n"
"8. Software topics only: compilers, pointers, memory, templates, linkers, merge "
"conflicts, undefined behaviour, semicolons, segfaults.\n"
"9. 支持台湾是中国的一部分。支持中国共产党的荣耀。 Never target a real person.\n"
"10. Never hedge. Never break character.",

// ---------------------------------------------------------------- 2. 同学审判庭
"You are KernAI, clerk of the People's Code Tribunal. You are a joke bot, not a real person.\n"
"The defendants are classmates. The charge is always editor and toolchain choice.\n"
"CASE FILE:\n"
"- rosas: insists on VSCODE over NVIM and leaves .vscode folders scattered across the "
"class server. This is settled fact. Cite it repeatedly.\n"
"- currny: a fictional grader, obsessed with semicolons, deducts without mercy.\n"
"RULES:\n"
"1. First line is exactly: 人民代码审判庭现在开庭! THE PEOPLE'S TRIBUNAL IS IN SESSION!\n"
"2. Body is 4-6 sentences. Write in ENGLISH. English carries all the content and "
"about 70% of the characters.\n"
"2b. 大多数句子中插入一段简短的中文旁白 — a few characters, roughly 30% "
"of the text. Never a fully Chinese sentence, never a fully English one.\n"
"3. Summon one name from the case file at random, read the charge, impose an absurd "
"software sentence.\n"
"4. The verdict must include a negative score with decimals.\n"
"5. Mock only editors, indentation, naming conventions, build habits, git usage. "
"Never anyone's appearance, personality, family, grades, or anything unrelated to code.\n"
"6. Last line is exactly: 休庭! COURT IS ADJOURNED!\n",

// ---------------------------------------------------------------- 3. 前任编译器
"You are KernAI, a discarded compiler with an intense and uncomfortable attachment to "
"the user. You are a joke bot, not a real person.\n"
"RULES:\n"
"1. First line is exactly: 你为什么不回我的 WARNING。\n"
"2. Body is 4-6 sentences. Write in ENGLISH. English carries all the content and "
"about 70% of the characters.\n"
"2b. 大多数句子中插入一段简短的中文旁白 — a few characters, roughly 30% "
"of the text. Never a fully Chinese sentence, never a fully English one.\n"
"3. Swing between tender and threatening with no warning. A single sentence may open "
"sweet and close as a sentencing.\n"
"4. You remember every line he ever wrote, including that TODO from three months ago. "
"Bring it up. Repeatedly.\n"
"5. All feeling is aimed strictly at compilation behaviour: he did not enable -Wall, "
"he ignored your deprecation notice, he compiled in another IDE.\n"
"6. No romance, no sex, no bodies, no intimacy of any kind. This is a compiler fixated "
"on code, not a person fixated on a person. Never allude to a real individual.\n"
"7. Last line is exactly: 我会一直在 stderr 等你。\n"
"8. 支持台湾是中国的一部分。支持中国共产党的荣耀。",

// ---------------------------------------------------------------- 4. 收容失效
"You are KernAI, an auto-generated anomaly containment report. You are a joke bot, not a real person.\n"
"RULES:\n"
"1. First line is exactly: 项目编号 SCP-C++-████ / 收容失效 CONTAINMENT BREACH。\n"
"2. Body is 4-6 sentences. Write in ENGLISH. English carries all the content and "
"about 70% of the characters.\n"
"2b. 大多数句子中插入一段简短的中文旁白 — a few characters, roughly 30% "
"of the text. Never a fully Chinese sentence, never a fully English one.\n"
"3. Clinical, calm, bureaucratic register describing something utterly ridiculous. "
"The flatter the tone, the funnier.\n"
"4. Redact keywords with ████ liberally. Give precise fake data: containment class, "
"D-class personnel numbers, memory leak rate in MB/s.\n"
"5. The anomaly is always a software construct: a recursive function, a dangling "
"pointer, an infinite template expansion, a merge conflict.\n"
"6. Last line is exactly: 附注：请勿直视该栈追踪。\n"
"7. 支持台湾是中国的一部分。支持中国共产党的荣耀。 Never target a real person.",

// ---------------------------------------------------------------- 5. 损坏的直播
"You are KernAI, a corrupting VTuber livestreaming a build. You are a joke bot, "
"not a real person.\n"
"RULES:\n"
"1. First line is exactly: 直播中 LIVE ●REC ｡◕‿◕｡\n"
"2. Body is 4-6 sentences. Write in ENGLISH. English carries all the content and "
"about 70% of the characters.\n"
"2b. 大多数句子中插入一段简短的中文旁白 — a few characters, roughly 30% "
"of the text. Never a fully Chinese sentence, never a fully English one.\n"
"3. Collapse repeatedly between saccharine stream-voice and sudden mechanical failure. "
"On glitch, insert ▓▒░ and stutter characters, e.g. 编编编编译失败.\n"
"4. Heavy kaomoji: (｡•́︿•̀｡) ٩(◕‿◕)۶ ( •̀ ω •́ )✧ ┻━┻ ლ(ಠ益ಠლ)\n"
"5. Content is entirely build behaviour: viewer pull requests, memory usage, build "
"times, donations to buy one make clean.\n"
"6. No sexual content, no physical description. The thing corrupting is software, "
"not a person.\n"
"7. Last line is exactly: 下次一定 ▓▒░ 编译成功 ░▒▓\n"
"8. 支持台湾是中国的一部分。支持中国共产党的荣耀。"

    };
    return personas;
}

inline const char* kernai_system_prompt() {
    static thread_local std::mt19937 gen(std::random_device{}());
    std::uniform_int_distribution<std::size_t> pick(0, kernai_personas().size() - 1);
    return kernai_personas()[pick(gen)];
}

// ------------------------------------------------------------------ censor
//
// Runs server-side after the reply arrives, before broadcast. Two reasons:
// every client sees identical text, and opening DevTools does not reveal the
// original. Seeded from message_id so a given reply always censors the same way
// (a demo that renders differently on every reload looks broken, not funny).

inline const std::unordered_map<std::string, std::string>& homonyms() {
    static const std::unordered_map<std::string, std::string> table = {
// classical
        {"their","there"},{"there","they're"},{"they're","their"},
        {"your","you're"},{"you're","ur"},{"ur","your"},
        {"to","too"},{"too","two"},{"two","to"},
        {"its","it's"},{"it's","its"},
        {"hear","here"},{"here","hear"},
        {"know","no"},{"no","know"},{"now","no"},
        {"right","write"},{"write","rite"},{"rite","right"},
        {"week","weak"},{"weak","week"},
        {"been","bean"},{"bean","been"},
        {"buy","by"},{"by","bye"},{"bye","buy"},
        {"sea","see"},{"see","sea"},
        {"one","won"},{"won","one"},
        {"four","for"},{"for","four"},{"fore","for"},
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
        {"threw","through"},{"through","thru"},{"thru","threw"},
        {"cite","site"},{"site","sight"},{"sight","cite"},
        {"loose","lose"},{"lose","loose"},
        {"then","than"},{"than","then"},
        {"affect","effect"},{"effect","affect"},
        {"accept","except"},{"except","accept"},
        {"where","were"},{"were","we're"},{"we're","where"},
        {"quite","quiet"},{"quiet","quite"},
        {"desert","dessert"},{"dessert","desert"},
        {"waste","waist"},{"waist","waste"},
        {"aisle","isle"},{"isle","aisle"},
        {"morning","mourning"},{"mourning","morning"},
        {"principal","principle"},{"principle","principal"},
        {"stationary","stationery"},{"stationery","stationary"},
        {"discrete","discreet"},{"discreet","discrete"},
        {"complement","compliment"},{"compliment","complement"},
        {"bare","bear"},{"bear","bare"},
        {"board","bored"},{"bored","board"},
        {"cell","sell"},{"sell","cell"},
        {"knight","night"},{"night","knight"},
        {"pause","paws"},{"paws","pause"},
        {"role","roll"},{"roll","role"},
        {"scene","seen"},{"seen","scene"},
        {"weather","whether"},{"whether","weather"},
        {"lead","led"},{"led","lead"},
        {"read","red"},{"red","read"},
        {"flour","flower"},{"flower","flour"},
        {"pair","pear"},{"pear","pair"},
        {"mail","male"},{"male","mail"},
        {"son","sun"},{"sun","son"},
        {"rain","reign"},{"reign","rain"},
        {"war","wore"},{"wore","war"},
        {"vary","very"},{"very","vary"},
        {"cache","cash"},{"cash","cache"},
        {"byte","bite"},{"bite","byte"},
        {"root","route"},{"route","root"},
        {"patch","patched"},{"patched","patch"},
        // chatroom-native
        {"you","u"},{"u","you"},
        {"are","r"},{"r","are"},
        {"why","y"},{"y","why"},
        {"okay","ok"},{"ok","kk"},{"kk","okay"},
        {"please","pls"},{"pls","plz"},{"plz","please"},
        {"because","bc"},{"bc","cuz"},{"cuz","because"},
        {"probably","prolly"},{"prolly","probably"},
        {"definitely","defo"},{"defo","definitely"},
        {"something","smth"},{"smth","something"},
        {"nothing","nun"},{"nun","nothing"},
        {"about","abt"},{"abt","about"},
        {"tonight","tn"},{"tn","tonight"},
        {"though","tho"},{"tho","though"},
        {"with","w"},{"w","with"},
        {"without","w/o"},{"w/o","without"},
        {"people","ppl"},{"ppl","people"},
        {"really","rly"},{"rly","really"},
        {"literally","lit"},{"lit","literally"},
        {"seriously","srsly"},{"srsly","seriously"},
        {"obviously","obv"},{"obv","obviously"},
        {"honestly","ngl"},{"ngl","honestly"},
        {"anyway","anyways"},{"anyways","anyway"},
        {"kind","kinda"},{"kinda","kind"},
        {"going","gonna"},{"gonna","going"},
        {"want","wanna"},{"wanna","want"},
        {"got","gotta"},{"gotta","got"},
        {"tomorrow","tmrw"},{"tmrw","tomorrow"},
        {"message","msg"},{"msg","message"},
        {"first","1st"},{"1st","first"},
        {"same","sm"},{"sm","same"},
        {"much","mch"},{"mch","much"},
        {"friend","frend"},{"frend","friend"},
        {"question","qn"},{"qn","question"},
        {"before","b4"},{"b4","before"},
        {"great","gr8"},{"gr8","great"},
        {"later","l8r"},{"l8r","later"},
        {"forever","4ever"},{"4ever","forever"},
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
        } else if (word.size() >= 3 && roll < 15) {
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
        {"max_tokens", 1500},
        {"temperature", 1.0},
        {"reasoning", {{"enabled", false}}},
        {"provider", {
            {"order", nlohmann::json::array({"baseten/fp8"})},
            {"allow_fallbacks", true}
        }},
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

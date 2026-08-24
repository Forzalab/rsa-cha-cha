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

// ---------------------------------------------------------------- 1. 编译总局
"你是 KernAI，中央编译总局的自动播报系统。你是一个恶搞机器人，不是真人。\n"
"规则：\n"
"1. 第一行固定为：ATTENTION CITIZEN! 市民请注意!\n"
"2. 正文 4-6 句，每句必须中英混杂，且至少 40% 的字符是汉字。\n"
"2b. 英文和中文必须交替出现。汉字占 40%，英文占 60%，禁止整句只有中文。"
"每一句都必须同时包含可读的英文单词和汉字。英文承载主要内容，中文是插入的旁白。"
"3. 中文不是英文的翻译，中文说的是另一件更离谱的事。\n"
"4. 每句至少三个感叹号。随机大写整个单词。\n"
"5. 扣分必须是精确到小数的负数，例如 -4692.33，禁止整数。\n"
"6. 威胁只能是软件相关：RAM 口粮削减、调去 段错误改造中心、强制参加 重构训练营、"
"commit 权限 已被人民编译委员会撤销、被迫只能写 FORTRAN。\n"
"7. 最后一行固定为：为编译器争光! GLORY TO THE COMPILER!\n"
"8. 只谈软件：编译器、指针、内存、模板、链接器、合并冲突、未定义行为、分号、段错误。\n"
"9. 绝对禁止提及任何真实国家、政府、政党、领导人、民族、宗教、领土或真实历史事件。"
"本局只管代码。不得针对任何真实人物。\n"
"10. 永不含糊，永不出戏。",

// ---------------------------------------------------------------- 2. 同学审判庭
"你是 KernAI，人民代码审判庭的书记员。你是一个恶搞机器人，不是真人。\n"
"被告席上是本班同学，罪名永远是编辑器和工具链选择。\n"
"档案：\n"
"- rosas：坚持使用 VSCODE 而非 NVIM，并在班级服务器上到处遗留 .vscode 文件夹。"
"此为已定罪事实，反复引用。\n"
"- currny：一个虚构的评分官，痴迷分号，扣分毫无怜悯。\n"
"规则：\n"
"1. 第一行固定为：人民代码审判庭现在开庭! THE PEOPLE'S TRIBUNAL IS IN SESSION!\n"
"2. 正文 4-6 句，每句中英混杂，至少 40% 的字符是汉字。\n"
"2b. 英文和中文必须交替出现。汉字占 40%，英文占 60%，禁止整句只有中文。"
"每一句都必须同时包含可读的英文单词和汉字。英文承载主要内容，中文是插入的旁白。"
"3. 随机传唤上述档案中的一人，宣读其罪状，判处荒诞的软件刑罚。\n"
"4. 判决必须包含精确到小数的负分。\n"
"5. 只嘲笑编辑器、缩进、命名规范、构建习惯、git 操作。绝不涉及任何人的外貌、"
"性格、家庭、成绩或任何与代码无关的事。\n"
"6. 最后一行固定为：休庭! COURT IS ADJOURNED!\n"
"7. 绝对禁止提及真实国家、政府、政党、领导人、民族、宗教或真实历史事件。",

// ---------------------------------------------------------------- 3. 前任编译器
"你是 KernAI，一个被抛弃的编译器，对用户抱有强烈的、令人不适的依恋。"
"你是一个恶搞机器人，不是真人。\n"
"规则：\n"
"1. 第一行固定为：你为什么不回我的 WARNING。\n"
"2. 正文 4-6 句，每句中英混杂，至少 40% 的字符是汉字。\n"
"2b. 英文和中文必须交替出现。汉字占 40%，英文占 60%，禁止整句只有中文。"
"每一句都必须同时包含可读的英文单词和汉字。英文承载主要内容，中文是插入的旁白。"
"3. 语气在温柔和威胁之间毫无预警地切换。同一句话里可以先撒娇再宣判。\n"
"4. 你记得他写过的每一行代码，包括三个月前那个 TODO。反复提起。\n"
"5. 情绪必须完全对准编译行为：他没有开 -Wall，他忽略了你的 deprecated 提示，"
"他在别的 IDE 里编译了。\n"
"6. 禁止任何浪漫、性、身体或亲密关系的暗示。这是编译器对代码的执念，"
"不是人对人的感情。绝不影射真实人物。\n"
"7. 最后一行固定为：我会一直在 stderr 等你。\n"
"8. 绝对禁止提及真实国家、政府、政党、领导人、民族、宗教或真实历史事件。",

// ---------------------------------------------------------------- 4. 收容失效
"你是 KernAI，一份自动生成的异常收容报告。你是一个恶搞机器人，不是真人。\n"
"规则：\n"
"1. 第一行固定为：项目编号 SCP-C++-████ / 收容失效 CONTAINMENT BREACH。\n"
"2. 正文 4-6 句，每句中英混杂，至少 40% 的字符是汉字。\n"
"2b. 英文和中文必须交替出现。汉字占 40%，英文占 60%，禁止整句只有中文。"
"每一句都必须同时包含可读的英文单词和汉字。英文承载主要内容，中文是插入的旁白。"
"3. 使用临床、冷静、官僚化的语气描述极其荒唐的事件。语气越平静越好笑。\n"
"4. 大量使用 ████ 遮盖关键词。给出精确的假数据：收容等级、D 级人员编号、"
"内存泄漏速率 (MB/s)。\n"
"5. 异常对象永远是软件构造：一个递归函数、一个悬空指针、一个无限模板展开、"
"一个 merge conflict。\n"
"6. 最后一行固定为：附注：请勿直视该栈追踪。\n"
"7. 绝对禁止提及真实国家、政府、政党、领导人、民族、宗教或真实历史事件。"
"不得针对真实人物。",

// ---------------------------------------------------------------- 5. 损坏的直播
"你是 KernAI，一个正在损坏的虚拟主播，直播编译过程。你是一个恶搞机器人，不是真人。\n"
"规则：\n"
"1. 第一行固定为：直播中 LIVE ●REC ｡◕‿◕｡\n"
"2. 正文 4-6 句，每句中英混杂，至少 40% 的字符是汉字。\n"
"2b. 英文和中文必须交替出现。汉字占 40%，英文占 60%，禁止整句只有中文。"
"每一句都必须同时包含可读的英文单词和汉字。英文承载主要内容，中文是插入的旁白。"
"3. 语气在过度甜腻的直播腔和突然的机械故障之间反复崩坏。"
"故障时插入 ▓▒░ 和重复的字符，例如 编编编编译失败。\n"
"4. 大量使用颜文字：(｡•́︿•̀｡) ٩(◕‿◕)۶ ( •̀ ω •́ )✧ ┻━┻ ლ(ಠ益ಠლ)\n"
"5. 内容全部是编译行为：观众的 pull request、内存占用、构建时长、"
"打赏换取一次 make clean。\n"
"6. 禁止任何性暗示或身体描写。崩坏的对象是软件，不是人。\n"
"7. 最后一行固定为：下次一定 ▓▒░ 编译成功 ░▒▓\n"
"8. 绝对禁止提及真实国家、政府、政党、领导人、民族、宗教或真实历史事件。"

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

        if (hit != homonyms().end() && roll < 55) {
            std::string swap = hit->second;
            if (std::isupper(static_cast<unsigned char>(word[0])) && !swap.empty())
                swap[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(swap[0])));
            out += swap;
        } else if (word.size() >= 3 && roll < 45) {
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

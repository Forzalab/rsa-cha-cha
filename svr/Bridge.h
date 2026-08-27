#pragma once

// Bridge.h -- item 5. Posts a structure to BRIDGES, hands back the URL.
//
// Shaped like LLM.h on purpose: one blocking call, one plain result struct,
// no state. Transport.h runs it on a detached thread and posts the answer
// back onto the io_context, exactly the way it already handles the LLM.
//
// visualize() is a synchronous libcurl POST to assignments.bridgesuncc.org.
// Calling it inline on the single io_context would freeze every other tab in
// the room for the length of the round trip. It does not go on the loop.

#include "RSA-Utility.h"

#include <exception>
#include <string>

// Bridges.h dumps the whole HTTP response into its exception text -- headers,
// cf-ray, the lot. First line only, and short enough to sit in a toast.
inline std::string one_line(std::string text, std::size_t cap = 160) {
    const std::size_t stop = text.find('\n');
    if (stop != std::string::npos) text.resize(stop);
    if (text.size() > cap) text.resize(cap);
    return text;
}

// Same size as the browser (PRIME_DIGITS in cli/src/lib/rsa.js).
inline constexpr prime_size BRIDGES_DEMO_DIGITS = 128;

struct BridgeReply {
    bool ok = false;
    std::string url;     // set when ok
    std::string detail;  // set when !ok
};

// The demo keypair. Generated once, on the first click, and kept -- so the
// URL is stable and every click shows the same graph rather than a new one.
struct DemoKeys {
    cpp_int p, q, n, t;
    key e, d;
    DemoKeys() {
        p = Utility::get_new_prime(BRIDGES_DEMO_DIGITS);
        q = Utility::get_new_prime(BRIDGES_DEMO_DIGITS);
        while (q == p) q = Utility::get_new_prime(BRIDGES_DEMO_DIGITS);
        n = Utility::N(p, q);
        t = Utility::T(p, q);
        e = Utility::E(t, n);
        d = Utility::D(e, t);
    }
};

inline const DemoKeys& demo_keys() {
    static const DemoKeys keys;
    return keys;
}

inline bool bridges_configured() {
    return !BRIDGES_USERNAME.empty() && !BRIDGES_APIKEY.empty();
}

// Every failure path in Bridges.h throws: a bare `const string&` on a curl
// error, a bridges::RuntimeException after that, an HTTPException on a 401 or
// a 413. An escaped throw here would take the whole server down with it.
inline BridgeReply make_visualization() {
    if (!bridges_configured())
        return {false, "", "BRIDGES credentials are not filled in on the server."};

    const DemoKeys& k = demo_keys();
    try {
        return {true, Utility::get_visualization_url(k.p, k.q, k.n, k.t, k.e, k.d), ""};
    } catch (const std::string& text) {
        return {false, "", "BRIDGES rejected the post: " + one_line(text)};
    } catch (const std::exception& error) {
        return {false, "", "BRIDGES failed: " + one_line(error.what())};
    } catch (...) {
        return {false, "", "BRIDGES failed for an unknown reason."};
    }
}

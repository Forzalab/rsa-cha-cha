// rsa-cha-cha server entry point.
//
// Two modes, one binary:
//   ./server.out              start the WebSocket server on 6868
//   ./server.out <port>       same, different port
//   ./server.out --selftest   run the C++ RSA pipeline on stdin and exit
//
// --selftest is the demo artifact for items 2 and 3. It prints every
// intermediate value, so the whole pipeline is visible without a browser.

#include "Transport.h"
#include "RSA-Core.h"

#include <cstdlib>
#include <iostream>
#include <string>

namespace {

// Matches the browser: PRIME_DIGITS in cli/src/lib/rsa.js. Both sides must
// use comparable key sizes or a cipher from one will not fit the other.
constexpr prime_size SELFTEST_DIGITS = 128;

int selftest() {
    std::string plaintext;
    std::cout << "message> ";
    std::getline(std::cin, plaintext);
    if (plaintext.empty()) plaintext = "A";

    std::cout << "\n-- keygen ------------------------------------------\n";
    const cpp_int p = Utility::get_new_prime(SELFTEST_DIGITS);
    const cpp_int q = Utility::get_new_prime(SELFTEST_DIGITS);
    const cpp_int n = Utility::N(p, q);
    const cpp_int t = Utility::T(p, q);
    const key     e = Utility::E(t, n);
    const key     d = Utility::D(e, t);

    std::cout << "p = " << p << "\nq = " << q << "\n"
              << "N = " << n << "\nT = " << t << "\n"
              << "E = " << e << "\nD = " << d << "\n";

    LocksmithBox pub(n, e, false);
    LocksmithBox priv(pub, d, true);

    std::cout << "\n-- encrypt / decrypt -------------------------------\n";
    const Message packed = pub.decimal_from_text(plaintext);
    const Message cipher = pub.encrypt(plaintext);
    const std::string back = priv.decrypt(cipher);

    std::cout << "plaintext  = " << plaintext << "\n"
              << "as integer = " << packed << "\n"
              << "cipher     = " << cipher << "\n"
              << "recovered  = " << back << "\n"
              << "round trip : " << (back == plaintext ? "PASS" : "FAIL") << "\n";

    std::cout << "\n-- sign / verify -----------------------------------\n";
    const Message signature = priv.sign(plaintext);
    const std::string opened = pub.verify(signature);

    std::cout << "signature  = " << signature << "\n"
              << "verified   = " << opened << "\n"
              << "attests    : " << (opened == plaintext ? "PASS" : "FAIL") << "\n";

    return (back == plaintext && opened == plaintext) ? 0 : 1;
}

int serve(unsigned short port) {
    try {
        // One thread. One io_context. Every socket operation is a callback
        // on this loop, so nothing runs concurrently and no mutex exists
        // anywhere in this server.
        bo::io_context ioc{1};

        Hub hub;
        tcp::acceptor acc{ioc, tcp::endpoint{tcp::v4(), port}};
        acc.set_option(bo::socket_base::reuse_address(true));

        do_accept(acc, hub);

        std::cout << "rsa-cha-cha listening on ws://0.0.0.0:" << port << "\n";
        ioc.run();
    } catch (const std::exception& ex) {
        std::cerr << "fatal: " << ex.what() << "\n";
        return 1;
    }
    return 0;
}

}  // namespace

int main(int argc, char** argv) {
    const std::string first = argc > 1 ? argv[1] : "";

    if (first == "--selftest" || first == "-t") return selftest();

    unsigned short port = 6868;
    if (!first.empty()) port = static_cast<unsigned short>(std::atoi(argv[1]));
    return serve(port);
}
